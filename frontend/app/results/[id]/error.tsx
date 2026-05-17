'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('Results page error:', error)
    // Capture with Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        level: 'error',
        tags: {
          section: 'results',
        },
      })
    }
  }, [error])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <main className="flex flex-col items-center justify-center py-8 px-4 max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Analysis Failed
            </CardTitle>
            <CardDescription>Unable to load analysis results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {error.message || 'An error occurred while loading the analysis results.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => reset()} className="flex-1">
                Try Again
              </Button>
              <Link href="/history" className="flex-1">
                <Button variant="outline" className="w-full">
                  View History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
