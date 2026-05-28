'use client'

import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDemoFetch } from '@/lib/hooks/useDemoFetch'
import { useDemoDetail } from '@/lib/hooks/useDemoDetail'
import { SensitivityTuner } from '@/components/Analytics/SensitivityTuner'
import { TraceCard } from '@/components/DemoDetail/TraceCard'
import { DemoViewer } from '@/components/DemoViewer/DemoViewer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { ConsoleHeader, ConsolePage, ConsolePanel, ResearchSignalNotice, StatusBadge } from '@/components/Console'
import { buildResultDashboardViewModel } from '@/lib/result-dashboard'
import {
  PlayerEvidenceDetail,
  PlayerEvidenceTable,
  ResultDashboardTabs,
  ResultEmptyState,
  ResultOverviewPanel,
} from '@/components/ResultsDashboard'

export default function ResultsPage() {
  const params = useParams()
  const demoId = params.id as string

  const { demo, isLoading, error, isTimeout, failureCount } = useDemoFetch(demoId)
  const { data: demoDetail } = useDemoDetail(demoId)
  const dashboard = useMemo(() => demo ? buildResultDashboardViewModel(demo) : null, [demo])
  const [selectedSteamId, setSelectedSteamId] = useState<string | null>(null)

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
    const selectedRow =
      dashboard?.playerRows.find((row) => row.steamId === selectedSteamId) ??
      dashboard?.playerRows[0] ??
      dashboard?.aggregateRows[0] ??
      null

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
          {dashboard && <ResultOverviewPanel demo={demo} model={dashboard} />}

          {dashboard && dashboard.topReviewSignals.length > 0 && (
            <ConsolePanel
              title="Top Player Review Signals"
              description="Highest player-level research signals from this result payload."
            >
              <div className="grid gap-3 md:grid-cols-3">
                {dashboard.topReviewSignals.map((row) => (
                  <button
                    key={row.steamId}
                    type="button"
                    onClick={() => setSelectedSteamId(row.steamId)}
                    className="rounded-lg border border-border-subtle bg-surface-raised p-3 text-left transition-colors hover:border-trace-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{row.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{row.confidenceLabel}</div>
                      </div>
                      <span className="font-data text-sm font-semibold">{row.scoreLabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ConsolePanel>
          )}

          {dashboard && (
            <ResultDashboardTabs
              players={
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
                  <div className="space-y-4">
                    <PlayerEvidenceTable
                      rows={dashboard.playerRows}
                      aggregateRows={dashboard.aggregateRows}
                      selectedSteamId={selectedRow?.steamId ?? null}
                      onSelect={(row) => setSelectedSteamId(row.steamId)}
                    />
                    <ResultEmptyState model={dashboard} />
                    {dashboard.aggregateRows.length > 0 && (
                      <PlayerEvidenceDetail row={dashboard.aggregateRows[0]} demoId={demoId} />
                    )}
                  </div>
                  <PlayerEvidenceDetail row={selectedRow} demoId={demoId} />
                </div>
              }
              trace={<TraceCard demoId={demoId} playerId={selectedRow?.profileHref ? selectedRow.steamId : undefined} />}
              sensitivity={
                <SensitivityTuner
                  demoId={demoId}
                  featureVectors={demoDetail?.featureVectors ?? null}
                  baselineSuspicion={demoDetail?.baselineSuspicion ?? null}
                />
              }
              viewer={
                <DemoViewer
                  demoId={demoId}
                  mapName={demoDetail?.metadata?.map ?? demo.map ?? 'de_dust2'}
                  analyzed={demo.status === 'done'}
                />
              }
            />
          )}
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
