'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to Sentry or error tracking service
    console.error('Global error:', error)
    // Capture with Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        level: 'error',
        contexts: {
          errorBoundary: {
            componentStack: error.stack,
            errorMessage: error.message,
          },
        },
      })
    }
  }, [error])

  return (
    <html>
      <body className="min-h-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-4">
        <div className="max-w-md w-full">
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Something Went Wrong
              </CardTitle>
              <CardDescription>An unexpected error occurred</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-700 dark:text-gray-300 overflow-auto max-h-32">
                {process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'}
              </div>
              {process.env.NODE_ENV === 'development' && error.digest && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Error ID: {error.digest}
                </p>
              )}
              <Button
                onClick={() => reset()}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
                className="w-full"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
