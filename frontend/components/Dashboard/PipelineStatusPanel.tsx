import { AlertTriangle, RefreshCcw } from 'lucide-react'

import { ConsoleMetric, ConsolePanel, StatusBadge } from '@/components/Console'
import type { DemoSummaryDto } from '@/lib/types'
import type { SteamMatchHistoryStatus } from '@/lib/hooks/useSteamMatchHistory'

interface PipelineStatusPanelProps {
  demos: DemoSummaryDto[]
  total: number
  isLoading?: boolean
  error?: string | null
  tracking?: SteamMatchHistoryStatus | null
}

const trackingAttentionStatuses: SteamMatchHistoryStatus['status'][] = [
  'invalid_seed',
  'auth_failed',
  'rate_limited',
  'steam_unavailable',
]

export function PipelineStatusPanel({
  demos,
  total,
  isLoading = false,
  error,
  tracking,
}: PipelineStatusPanelProps) {
  const pending = demos.filter((demo) => demo.status === 'pending').length
  const done = demos.filter((demo) => demo.status === 'done').length
  const errors = demos.filter((demo) => demo.status === 'error').length
  const trackingNeedsAttention =
    tracking?.connected === true && trackingAttentionStatuses.includes(tracking.status)
  const attention = errors + (trackingNeedsAttention ? 1 : 0)
  const lastRefresh = isLoading ? 'Refreshing now' : 'Scope current'
  const trackingLabel = trackingLabelFor(tracking)

  return (
    <ConsolePanel
      title="Pipeline status"
      description="Current dashboard scope, parser backlog, completed analyses, and recovery states."
      action={
        error ? (
          <StatusBadge variant="demo-error" label="Scope error" />
        ) : isLoading ? (
          <StatusBadge variant="demo-processing" label="Refreshing" />
        ) : (
          <StatusBadge variant="demo-done" label="Ready" />
        )
      }
    >
      {error && (
        <div className="mb-4 flex gap-2 rounded-lg border border-signal-high/35 bg-signal-high-bg p-3 text-sm text-signal-high">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ConsoleMetric label="In scope" value={total} detail={lastRefresh} tone="trace" />
        <ConsoleMetric label="Queued" value={pending} detail="Awaiting demo parser" tone={pending > 0 ? 'review' : 'neutral'} />
        <ConsoleMetric label="Analyzed" value={done} detail="Ready for review" tone="clean" />
        <ConsoleMetric label="Attention" value={attention} detail={attentionLabel(errors, trackingNeedsAttention)} tone={attention > 0 ? 'high' : 'neutral'} />
        <ConsoleMetric
          label="Tracking"
          value={trackingLabel.value}
          detail={trackingLabel.detail}
          tone={trackingLabel.tone}
        />
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCcw className="size-3.5" aria-hidden />
        <span>{tracking?.last_check_at ? `Last match-history check: ${formatDate(tracking.last_check_at)}` : 'No match-history check recorded yet'}</span>
      </div>
    </ConsolePanel>
  )
}

function attentionLabel(errors: number, trackingNeedsAttention: boolean): string {
  if (errors > 0 && trackingNeedsAttention) return 'Demo and tracking recovery'
  if (errors > 0) return 'Demo recovery needed'
  if (trackingNeedsAttention) return 'Tracking action needed'
  return 'No recovery items'
}

function trackingLabelFor(tracking?: SteamMatchHistoryStatus | null): {
  value: string
  detail: string
  tone: 'neutral' | 'clean' | 'review' | 'high' | 'trace'
} {
  if (!tracking || tracking.connected !== true) {
    return { value: 'Off', detail: 'Manual ingestion only', tone: 'neutral' }
  }

  switch (tracking.status) {
    case 'caught_up':
      return { value: 'Caught up', detail: 'No newer sharecode found', tone: 'clean' }
    case 'active':
      return { value: 'Active', detail: 'Discovery scheduled', tone: 'trace' }
    case 'invalid_seed':
    case 'auth_failed':
      return { value: 'Action', detail: 'User action required', tone: 'high' }
    case 'rate_limited':
      return { value: 'Backoff', detail: 'Valve rate limit active', tone: 'review' }
    case 'steam_unavailable':
      return { value: 'Paused', detail: 'Steam temporarily unavailable', tone: 'review' }
    default:
      return { value: 'Off', detail: 'Manual ingestion only', tone: 'neutral' }
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}
