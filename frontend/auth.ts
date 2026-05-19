import { NextRequest } from 'next/server'
import { type NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth'
import type { Session } from 'next-auth'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const API_URL = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  .replace('http://php:80', 'http://nginx')
  .replace(/\/api$/, '')
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      steamId?: string
    }
    accessToken?: string
    refreshToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    steamId?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}

export const getAuthOptions = (req?: NextRequest): NextAuthOptions => ({
  providers: [
    {
      id: 'steam',
      name: 'Steam',
      type: 'oauth',
      // Steam OpenID 2.0 endpoint (not standard OAuth)
      authorization: {
        url: STEAM_OPENID_URL,
        params: {
          'openid.ns': 'http://specs.openid.net/auth/2.0',
          'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
          'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
          'openid.mode': 'checkid_setup',
          'openid.realm': NEXTAUTH_URL,
          'openid.return_to': `${NEXTAUTH_URL}/api/auth/callback/steam`,
        },
      },
      // Custom token endpoint that calls our backend for Steam validation
      token: {
        url: `${API_URL}/api/auth/steam-verify`,
        async request({ client, params, provider }) {
          const verifyUrl = (provider.token as any)?.url || `${API_URL}/api/auth/steam-verify`

          // Extract openid parameters from req.url
          let openidParams: Record<string, string> = {}
          if (req) {
            try {
              const urlObj = new URL(req.url)
              urlObj.searchParams.forEach((value, key) => {
                if (key.startsWith('openid.')) {
                  openidParams[key] = value
                }
              })
            } catch (e) {
              console.error('Failed to parse request URL in token.request:', e)
            }
          }

          // Fallback to params if openidParams is empty
          if (Object.keys(openidParams).length === 0 && params) {
            Object.entries(params).forEach(([key, value]) => {
              if (typeof value === 'string') {
                openidParams[key] = value
              }
            })
          }

          console.log('Sending token request to Symfony:', {
            url: verifyUrl,
            hasReq: !!req,
            openidParamsKeys: Object.keys(openidParams),
          })
          const response = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(openidParams),
          })

          if (!response.ok) {
            const errText = await response.text()
            console.error('Symfony verify failed:', errText)
            throw new Error(`Steam verification failed: ${response.statusText}`)
          }

          const tokens = await response.json()
          console.log('Symfony verify success, received tokens:', {
            hasAccessToken: !!tokens.access_token,
            steamId: tokens.steam_id,
          })
          return { tokens }
        },
      },
      // Userinfo override to bypass OIDC endpoint assertion and supply the profile directly from tokens
      userinfo: {
        async request({ tokens }) {
          return tokens as any
        }
      },
      // Profile extraction
      profile: async (profile: any) => ({
        id: profile.steam_id,
        name: profile.username,
        image: profile.avatar_url,
        email: profile.email || null,
        steam_id: profile.steam_id,
        access_token: profile.access_token,
        refresh_token: profile.refresh_token,
        expires_at: profile.expires_at,
      }),
      clientId: process.env.STEAM_APP_ID || '570',
      clientSecret: 'steam', // Dummy value
      checks: ['none'],
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log('JWT Callback Triggered:', {
        hasAccount: !!account,
        hasProfile: !!profile,
        profileData: profile ? {
          id: (profile as any).id,
          name: (profile as any).name,
          steam_id: (profile as any).steam_id,
        } : null,
        accountData: account ? {
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
        } : null
      })

      // On initial login, store tokens and user info
      if (account && profile) {
        token.sub = (profile as any).id
        token.steamId = (profile as any).steam_id || (profile as any).id
        token.accessToken = (profile as any).access_token || account.access_token
        token.refreshToken = (profile as any).refresh_token || account.refresh_token
        token.expiresAt = (profile as any).expires_at || account.expires_at
      } else if (token.expiresAt && Date.now() > token.expiresAt * 1000) {
        // Access token expired: try to refresh
        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          })

          if (!response.ok) {
            token.error = 'RefreshTokenExpired'
            return token
          }

          const newTokens = await response.json()
          token.accessToken = newTokens.access_token
          token.refreshToken = newTokens.refresh_token || token.refreshToken
          token.expiresAt = newTokens.expires_at
        } catch (error) {
          console.error('Token refresh failed:', error)
          token.error = 'RefreshTokenExpired'
        }
      }

      return token
    },

    async session({ session, token }): Promise<Session> {
      console.log('Session Callback Triggered:', {
        sub: token.sub,
        steamId: token.steamId,
        hasAccessToken: !!token.accessToken,
        error: token.error
      })

      // Check if token has error (refresh failed)
      if (token.error) {
        // Return expired session (will trigger re-auth)
        return {
          ...session,
          expires: new Date(0).toISOString(),
        }
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub || '',
          steamId: token.steamId,
        },
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      }
    },
  },

  // JWT strategy (no database session)
  session: { strategy: 'jwt' },

  // Security
  secret: process.env.NEXTAUTH_SECRET,

  // Cookie configuration
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },

  // Pages
  pages: {
    signIn: '/',
    error: '/',
  },
})

// Export static options and dynamic helper
export const authOptions = getAuthOptions()
export const auth = NextAuth(authOptions)
