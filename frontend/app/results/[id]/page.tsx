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
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { ConsoleHeader, ConsolePage, ResearchSignalNotice, StatusBadge } from '@/components/Console'

export default function ResultsPage() {
  const params = useParams()
  const demoId = params.id as string

  const { demo, isLoading, error, isTimeout, failureCount } = useDemoFetch(demoId)
  const { data: demoDetail } = useDemoDetail(demoId)

  // Not found state
  if (demo === null) {
    return (
      <ConsolePage>
        <ConsoleHeader
          title="Analysis Not Found"
          description="The demo you're looking for doesn't exist or has been deleted."
        />
        <div className="flex gap-2 mt-4">
          <Link href="/">
            <Button variant="outline">Back to Upload</Button>
          </Link>
          <Link href="/history">
            <Button variant="outline">View History</Button>
          </Link>
        </div>
      </ConsolePage>
    )
  }

  // Polling failed after 3 retries
  if (error && failureCount >= 3) {
    return (
      <ConsolePage>
        <ConsoleHeader
          title="Service Unreachable"
          description="Unable to reach analysis service. Results may be available if you check again."
        />
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Check Status
          </Button>
          <Link href="/">
            <Button variant="outline">Go Back</Button>
          </Link>
        </div>
      </ConsolePage>
    )
  }

  // Timeout state (5 minutes)
  if (isTimeout && demo?.status === 'pending') {
    return (
      <ConsolePage>
        <Card className="w-full p-6 bg-surface-panel border-border-subtle">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-semibold text-lg mb-2 text-foreground">Analysis Taking Longer Than Expected</h2>
              <p className="text-muted-foreground mb-4">
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
      </ConsolePage>
    )
  }

  // Loading state
  if (isLoading && !demo) {
    return (
      <ConsolePage>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-trace-primary" />
          <p className="text-muted-foreground">Loading analysis results...</p>
        </div>
      </ConsolePage>
    )
  }

  // Ready state - show results
  if (demo) {
    return (
      <ConsolePage width="wide">
        <Link href="/history" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trace-primary rounded w-fit">
          <ArrowLeft className="size-4" />
          <span>Back to History</span>
        </Link>

        <ConsoleHeader
          title="Analysis Results"
          metadata={
            <>
              <StatusBadge
                variant={
                  demo.status === 'pending' ? 'demo-pending' :
                  demo.status === 'done' ? 'demo-done' : 'demo-error'
                }
                label={
                  demo.status === 'pending' ? 'Analyzing' :
                  demo.status === 'done' ? 'Analyzed' : 'Analysis failed'
                }
              />
              <span>Demo ID: {demoId}</span>
              {demoDetail?.metadata?.map && <span>Map: {demoDetail.metadata.map}</span>}
              {demo?.created_at && <span>Uploaded: {new Date(demo.created_at).toLocaleDateString()}</span>}
            </>
          }
          description="View detailed feature vectors, TRACE rating, and 2D replay mapping for post-game research review."
          notice={<ResearchSignalNotice />}
        />

        <div className="space-y-6 mt-4">
          <ResultsCard demo={demo} />

          <div className="mt-6 grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <TraceCard demoId={demoId} />
            <SensitivityTuner
              demoId={demoId}
              featureVectors={demoDetail?.featureVectors ?? null}
              baselineSuspicion={demoDetail?.baselineSuspicion ?? null}
            />
          </div>

          <div className="w-full">
            <DemoViewer
              demoId={demoId}
              mapName={demoDetail?.metadata?.map ?? (demo as any).metadata?.map ?? (demo as any).map ?? 'de_dust2'}
              analyzed={demo.status === 'done'}
            />
          </div>
        </div>
      </ConsolePage>
    )
  }

  return (
    <ConsolePage>
      <Alert>
        <AlertTitle>Unknown Status</AlertTitle>
        <AlertDescription>
          Unable to determine demo status. Please try again.
        </AlertDescription>
      </Alert>
    </ConsolePage>
  )
}
