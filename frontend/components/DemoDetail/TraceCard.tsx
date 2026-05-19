'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TraceComponentChart } from './TraceComponentChart'
import { TraceChart } from './TraceChart'
import { TraceSparkline } from './TraceSparkline'
import { PercentileBadge } from './PercentileBadge'
import { CalibrationContextCard } from './CalibrationContextCard'
import { useTraceQuery } from '@/lib/hooks/useTraceQuery'
import { useTraceHistoryQuery } from '@/lib/hooks/useTraceHistoryQuery'
import { AlertCircle, Info } from 'lucide-react'
import { ConsolePanel, DataValue, StatusBadge } from '@/components/Console'

interface TraceCardProps {
  demoId: string
  playerId?: string // Optional: if provided, enables advanced visualizations
}

/**
 * Displays TRACE rating analysis for a demo.
 * Shows:
 * - Base, Adjusted, Normalized scores
 * - Trust multiplier with explanation
 * - Component breakdown chart (bar chart if playerId provided, else table)
 * - Percentile badges (if playerId provided)
 * - Historical trend sparkline (if playerId provided)
 * - Calibration context card (if playerId provided)
 * - Calibration version and timestamp
 *
 * States:
 * - Loading: skeleton placeholder
 * - Success: full TRACE card with optional advanced visualizations
 * - No TRACE (404): returns null (card hidden)
 * - Error: error message with retry button
 */
export function TraceCard({ demoId, playerId }: TraceCardProps): React.ReactNode {
  const { data: trace, isLoading, error, refetch } = useTraceQuery(demoId)
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useTraceHistoryQuery(playerId, 10)

  // No TRACE data available (404) - hide card completely
  if (!isLoading && trace === null) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <ConsolePanel
        title="TRACE Rating Analysis"
        description="Analyzing player behavior..."
      >
        <div className="space-y-4">
          <Skeleton className="h-6 w-full bg-surface-raised border border-border-subtle" />
          <Skeleton className="h-6 w-full bg-surface-raised border border-border-subtle" />
          <Skeleton className="h-6 w-full bg-surface-raised border border-border-subtle" />
          <Skeleton className="h-6 w-full bg-surface-raised border border-border-subtle" />
        </div>
      </ConsolePanel>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="bg-signal-high-bg border-signal-high/35 text-signal-high">
        <AlertCircle className="h-4 w-4 text-signal-high" />
        <AlertTitle className="font-semibold text-signal-high">Failed to Load TRACE Data</AlertTitle>
        <AlertDescription className="space-y-2 text-signal-high/90">
          <p>{error.message}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-signal-high/35 hover:bg-signal-high/10 text-signal-high hover:text-signal-high"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Success state - render TRACE card
  if (trace) {
    const formatNumber = (num: number, decimals = 2): string => {
      return num.toFixed(decimals)
    }

    const formatTimestamp = (isoString: string): string => {
      try {
        const date = new Date(isoString)
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'UTC',
          timeZoneName: 'short',
        })
      } catch {
        return isoString
      }
    }

    return (
      <ConsolePanel
        title="TRACE Rating Analysis"
        description="Detailed breakdown of player suspicion signal components"
        action={<StatusBadge variant="trace-available" />}
      >
        <div className="space-y-6">
          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-raised border border-border-subtle rounded-lg">
            {/* Base & Adjusted Scores */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  className="text-sm font-medium text-muted-foreground"
                  aria-label="Base TRACE score"
                >
                  Base Score
                </label>
                <code className="text-sm font-mono font-semibold text-foreground">
                  {formatNumber(trace.traceBase)}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <label
                  className="text-sm font-medium text-muted-foreground"
                  aria-label="Adjusted TRACE score"
                >
                  Adjusted Score
                </label>
                <code className="text-sm font-mono font-semibold text-foreground">
                  {formatNumber(trace.traceAdjusted)}
                </code>
              </div>
            </div>

            {/* Normalized & Trust Multiplier */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  className="text-sm font-medium text-muted-foreground"
                  aria-label="Normalized TRACE score"
                >
                  Normalized
                </label>
                <code className="text-sm font-mono font-semibold text-foreground">
                  {formatNumber(trace.traceNormalized)}
                </code>
              </div>
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Trust Multiplier
                  </label>
                  <div className="relative inline-block">
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-surface-raised border border-border-subtle text-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      Adjustment factor based on calibration
                    </div>
                  </div>
                </div>
                <code className="text-sm font-mono font-semibold text-foreground">
                  {formatNumber(trace.trustMultiplier, 4)}
                </code>
              </div>
            </div>
          </div>

          {/* Component Breakdown - Use new chart if playerId provided, else use table */}
          <div className="border border-border-subtle bg-surface-panel rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Component Scores
            </h3>

            {playerId && historyData && !historyError ? (
              <>
                {/* Advanced visualization: Bar chart with percentiles */}
                <TraceChart
                  components={trace.components}
                  percentiles={historyData.traces[0]?.percentiles || {
                    ekill: null,
                    aim: null,
                    kast: null,
                    util: null,
                    clutch: null,
                  }}
                  calibrationMean={1.0}
                />

                {/* Percentile badges for each component */}
                <div className="mt-4 p-3 bg-surface-raised border border-border-subtle rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Component Percentiles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <PercentileBadge
                      percentile={historyData.traces[0]?.percentiles.ekill || null}
                      componentName="E-Kill"
                    />
                    <PercentileBadge
                      percentile={historyData.traces[0]?.percentiles.aim || null}
                      componentName="AIM"
                    />
                    <PercentileBadge
                      percentile={historyData.traces[0]?.percentiles.kast || null}
                      componentName="KAST"
                    />
                    <PercentileBadge
                      percentile={historyData.traces[0]?.percentiles.util || null}
                      componentName="Utility"
                    />
                    <PercentileBadge
                      percentile={historyData.traces[0]?.percentiles.clutch || null}
                      componentName="Clutch"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Fallback: Simple table view from Phase 10 */
              <TraceComponentChart
                components={trace.components}
                trustMultiplier={trace.trustMultiplier}
              />
            )}
          </div>

          {/* Historical Trend Sparkline - if playerId provided */}
          {playerId && historyData && !historyLoading && !historyError && (
            <div className="border border-border-subtle bg-surface-panel rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">
                TRACE Trend
              </h3>
              <TraceSparkline
                history={historyData.traces}
                height={120}
                showTrend={true}
              />
            </div>
          )}

          {/* Calibration Context Card - if playerId provided */}
          {playerId && historyData && !historyLoading && !historyError && (
            <CalibrationContextCard
              calibrationVersion={trace.calibrationVersion}
              globalAverage={1.0}
              playerValue={trace.traceAdjusted}
              componentMeans={{
                ekill: 1.0,
                aim: 1.0,
                kast: 1.0,
                util: 1.0,
                clutch: 1.0,
              }}
            />
          )}

          {/* Calibration Info */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-surface-raised border border-border-subtle rounded">
            <div>
              <span className="font-medium">Calibration:</span>{' '}
              <code className="bg-surface-panel border border-border-subtle px-1.5 py-0.5 rounded text-xs font-mono">
                {trace.calibrationVersion}
              </code>
            </div>
            <div>
              <span className="font-medium">Calculated:</span> {formatTimestamp(trace.calculatedAt)}
            </div>
          </div>
        </div>
      </ConsolePanel>
    )
  }

  return null
}
