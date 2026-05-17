import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(request) {
    // Route protection logic is handled by withAuth
    // If not authenticated, withAuth automatically redirects to login
  },
  {
    pages: {
      signIn: '/',
    },
  }
)

export const config = {
  // Protect these routes: /dashboard, /results
  // Public routes: /, /auth/*, /api/auth/*, static files
  matcher: ['/dashboard/:path*', '/results/:path*'],
}
