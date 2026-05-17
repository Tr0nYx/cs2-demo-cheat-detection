import * as Sentry from '@sentry/nextjs'

// Initialize Sentry for server-side
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_RELEASE || 'dev',
    tracesSampleRate: 0.1,
  })
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
  }
}
