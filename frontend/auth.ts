import type { NextAuthOptions } from 'next-auth'
import { NextAuthOptions } from 'next-auth'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

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
      // Custom token endpoint that calls our backend for Steam validation
      token: {
        url: `${API_URL}/api/auth/steam-verify`,
        async request({ client, params, provider }) {
          // Pass OpenID assertion to backend for validation
          const response = await fetch(provider.token?.url || '', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          })

          if (!response.ok) {
            throw new Error(`Steam verification failed: ${response.statusText}`)
          }

          const tokens = await response.json()
          return { tokens }
        },
      },
      // Profile callback to extract user info from backend response
      profile: async (profile: any) => ({
        id: profile.steam_id,
        name: profile.username,
        image: profile.avatar_url,
        email: profile.email || null,
      }),
      clientId: process.env.STEAM_APP_ID || '570', // Default to test app ID
      clientSecret: 'steam-no-secret', // Steam OpenID doesn't use client secret
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // Initial login: store tokens and expiry
        token.accessToken = account.access_token || (profile as any).access_token
        token.refreshToken = account.refresh_token || (profile as any).refresh_token
        token.expiresAt = account.expires_at || (profile as any).expires_at
        token.steamId = token.sub // Steam ID is the subject
      } else if (token.expiresAt && Date.now() > token.expiresAt * 1000) {
        // Access token expired: try to refresh
        try {
          const response = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          })

          if (!response.ok) {
            // Refresh failed: mark for re-authentication
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
    async session({ session, token }) {
      if (token.error) {
        // Token is invalid; session should be cleared
        return {
          ...session,
          expires: new Date(0).toISOString(),
        }
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          steamId: token.steamId,
        },
      }
    },
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl

      // Public routes: allow access
      if (
        pathname === '/' ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next')
      ) {
        return true
      }

      // Protected routes: require valid session
      return !!auth?.user
    },
  },
  // JWT strategy (no database session)
  session: { strategy: 'jwt' },
  // Security settings
  secret: process.env.NEXTAUTH_SECRET,
  // Cookie configuration
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        // Secure is only set to true in production (HTTPS)
        secure: process.env.NODE_ENV === 'production',
        // SameSite=Strict for HTTPS, Lax for HTTP (localhost dev)
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
