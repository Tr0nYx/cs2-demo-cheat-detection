'use client'

import { useParams } from 'next/navigation'
import { useDemoFetch } from '@/lib/hooks/useDemoFetch'
import { useDemoDetail } from '@/lib/hooks/useDemoDetail'
import { ResultsCard } from '@/components/ResultsCard'
import { SensitivityTuner } from '@/components/Analytics/SensitivityTuner'
import { TraceCard } from '@/components/DemoDetail/TraceCard'
import { DemoViewer } from '@/components/DemoViewer/DemoViewer'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const params = useParams()
  const demoId = params.id as string

  const { demo, isLoading, error, isTimeout, failureCount } = useDemoFetch(demoId)
  const { data: demoDetail } = useDemoDetail(demoId)

  // Not found state
  if (demo === null) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <main className="flex flex-col items-center justify-center py-8 px-4 max-w-2xl w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Not Found</AlertTitle>
            <AlertDescription>
              <p className="mb-4">
                The demo you&apos;re looking for doesn&apos;t exist or has been deleted.
              </p>
              <div className="flex gap-2">
                <Link href="/">
                  <Button variant="outline">Back to Upload</Button>
                </Link>
                <Link href="/history">
                  <Button variant="outline">View History</Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  // Polling failed after 3 retries
  if (error && failureCount >= 3) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <main className="flex flex-col items-center justify-center py-8 px-4 max-w-2xl w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Service Unreachable</AlertTitle>
            <AlertDescription>
              <p className="mb-4">
                Unable to reach analysis service. Results may be available if you check again.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Check Status
                </Button>
                <Link href="/">
                  <Button variant="outline">Go Back</Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  // Timeout state (5 minutes)
  if (isTimeout && demo?.status === 'pending') {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <main className="flex flex-col items-center justify-center py-8 px-4 max-w-2xl w-full">
          <Card className="w-full p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Analysis Taking Longer Than Expected</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  The analysis has been running for more than 5 minutes. Results will appear when ready.
                  You can navigate away and check back later.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Check Status
                  </Button>
                  <Link href="/history">
                    <Button variant="outline">View History</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  // Loading state
  if (isLoading && !demo) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <main className="flex flex-col items-center justify-center py-8 px-4 max-w-2xl w-full space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    )
  }

  // Ready state - show results
  if (demo) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <main className="flex flex-col items-center justify-center py-8 px-4 max-w-7xl w-full">
          <div className="w-full mb-4">
            <Link href="/history" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              ← Back to History
            </Link>
          </div>

          <ResultsCard demo={demo} />

          <div className="mt-6 grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <TraceCard demoId={demoId} />
            <SensitivityTuner
              demoId={demoId}
              featureVectors={demoDetail?.featureVectors ?? null}
              baselineSuspicion={demoDetail?.baselineSuspicion ?? null}
            />
          </div>

          <div className="w-full mt-6">
            <DemoViewer
              demoId={demoId}
              mapName={demoDetail?.metadata?.map ?? (demo as any).metadata?.map ?? (demo as any).map ?? 'de_dust2'}
              analyzed={demo.status === 'done'}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <main className="flex flex-col items-center justify-center py-8 px-4 max-w-2xl w-full">
        <Alert>
          <AlertTitle>Unknown Status</AlertTitle>
          <AlertDescription>
            Unable to determine demo status. Please try again.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  )
}
