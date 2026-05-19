'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FeatureTable } from './FeatureTable'
import { Demo, Player } from '@/lib/types'
import { AlertCircle, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadDemoUrl } from '@/lib/api'
import { ConsolePanel, DataValue, StatusBadge } from '@/components/Console'

interface ResultsCardProps {
  demo: Demo
  onDownload?: (demoId: string) => void
}

export function ResultsCard({ demo }: ResultsCardProps) {
  // Handle pending state
  if (demo.status === 'pending') {
    return (
      <ConsolePanel
        title={
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-trace-primary" />
            <span>Analysis in Progress</span>
          </div>
        }
        description={
          <div className="flex items-center gap-2 text-xs">
            <span>Demo ID:</span>
            <DataValue>{demo.id}</DataValue>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground">Analysis running...</p>
            <p className="text-sm text-muted-foreground">
              The neural pipeline is parsing the demo ticks and extracting feature vectors. This usually takes 10-30 seconds.
            </p>
          </div>
          <Skeleton className="h-8 w-full bg-surface-raised border border-border-subtle" />
          <Skeleton className="h-32 w-full bg-surface-raised border border-border-subtle" />
        </div>
      </ConsolePanel>
    )
  }

  // Handle error state
  if (demo.status === 'error') {
    return (
      <Alert variant="destructive" className="bg-signal-high-bg border-signal-high/35 text-signal-high">
        <AlertCircle className="h-4 w-4 text-signal-high" />
        <AlertTitle className="font-semibold text-signal-high">Analysis Failed</AlertTitle>
        <AlertDescription className="text-signal-high/90">
          {demo.error_message || 'An unknown error occurred during analysis.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Handle done state
  if (demo.status === 'done' && demo.results) {
    const players = demo.results.players || []
    const overallScore = demo.results.overall_score ?? 0
    const hasOnlyDemoLevelResults = players.length > 0 && players.every((player) => player.steamId === '0')

    const overallStatusVariant = overallScore <= 33 ? 'suspicion-clean' : overallScore <= 66 ? 'suspicion-review' : 'suspicion-high'
    const overallStatusLabel = overallScore <= 33 ? 'Low review signal' : overallScore <= 66 ? 'Review signal' : 'High review signal'

    return (
      <div className="space-y-6">
        {/* Overall Results */}
        <ConsolePanel
          title="Analysis Results"
          description={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>Demo ID:</span>
              <DataValue>{demo.id}</DataValue>
            </div>
          }
          action={
            <a
              href={downloadDemoUrl(demo.id)}
              download
              target="_blank"
              rel="noreferrer"
              className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trace-primary rounded"
            >
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Demo
              </Button>
            </a>
          }
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-surface-raised border border-border-subtle">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Overall Suspicion Level
              </span>
              <div className="flex items-center gap-3">
                <StatusBadge variant={overallStatusVariant} label={overallStatusLabel} />
                <span className="text-lg font-bold text-foreground">
                  {Math.round(overallScore)}/100
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground max-w-md sm:text-right leading-relaxed">
              {hasOnlyDemoLevelResults
                ? 'This analysis produced demo-level aggregate signals only. The current result is not attributed to a specific player.'
                : 'This score aggregates gameplay anomaly signals across all parsed players. Check individual player profiles below for detailed feature verification.'}
            </div>
          </div>
        </ConsolePanel>

        {hasOnlyDemoLevelResults && (
          <Alert className="border-trace-primary/30 bg-trace-primary/5">
            <AlertCircle className="h-4 w-4 text-trace-primary" />
            <AlertTitle>Demo-level result only</AlertTitle>
            <AlertDescription>
              The stored result uses Steam ID 0, so these feature scores are not tied to a real player. Treat them as match-wide research signals until per-player extraction writes individual results.
            </AlertDescription>
          </Alert>
        )}

        {/* Per-player results */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {hasOnlyDemoLevelResults ? 'Demo Analysis Report' : 'Player Analysis Reports'}
          </h3>
          {players.map((player: Player) => {
            const isDemoLevelResult = player.steamId === '0'
            const playerStatusVariant = player.overallScore <= 33 ? 'suspicion-clean' : player.overallScore <= 66 ? 'suspicion-review' : 'suspicion-high'
            const playerStatusLabel = player.overallScore <= 33 ? 'Low review signal' : player.overallScore <= 66 ? 'Review signal' : 'High review signal'

            return (
              <ConsolePanel
                key={player.steamId}
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-semibold text-foreground text-lg">
                      {isDemoLevelResult ? 'Demo-wide aggregate' : player.name || 'Unknown Player'}
                    </span>
                    <DataValue className="text-xs">
                      {isDemoLevelResult ? 'No player attribution' : player.steamId}
                    </DataValue>
                  </div>
                }
                action={
                  <div className="flex items-center gap-3">
                    <StatusBadge variant={playerStatusVariant} label={playerStatusLabel} />
                    <span className="text-base font-bold text-foreground px-1">
                      {Math.round(player.overallScore)}/100
                    </span>
                  </div>
                }
              >
                {isDemoLevelResult && (
                  <p className="mb-3 rounded border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-muted-foreground">
                    These scores were persisted as a demo-level result, not as an individual player&apos;s analysis.
                  </p>
                )}

                {/* Features table */}
                {player.features && player.features.length > 0 ? (
                  <div className="rounded-lg border border-border-subtle bg-surface-panel overflow-hidden">
                    <FeatureTable features={player.features} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3 italic text-center bg-surface-panel rounded border border-border-subtle">
                    No feature data available for this player.
                  </p>
                )}
              </ConsolePanel>
            )
          })}

          {players.length === 0 && (
            <Alert>
              <AlertTitle>No Players Found</AlertTitle>
              <AlertDescription>
                No player data was extracted from this demo.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  return (
    <Alert>
      <AlertTitle>Unknown Status</AlertTitle>
      <AlertDescription>
        The demo status is unknown. Please try again later.
      </AlertDescription>
    </Alert>
  )
}
