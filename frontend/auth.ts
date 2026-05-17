import { type NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth'
import type { Session } from 'next-auth'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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

export const authOptions: NextAuthOptions = {
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
      // Custom token endpoint
      token: {
        url: `${API_URL}/api/auth/steam-verify`,
      },
      // Profile extraction
      profile: async (profile: any) => ({
        id: profile.steam_id,
        name: profile.username,
        image: profile.avatar_url,
        email: profile.email || null,
      }),
      clientId: process.env.STEAM_APP_ID || '570',
      clientSecret: 'steam', // Dummy value
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial login, store tokens and user info
      if (account && profile) {
        token.sub = (profile as any).steam_id
        token.steamId = (profile as any).steam_id
        token.accessToken = (profile as any).access_token
        token.refreshToken = (profile as any).refresh_token
        token.expiresAt = (profile as any).expires_at
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
}

// Export the auth instance
export const auth = NextAuth(authOptions)
