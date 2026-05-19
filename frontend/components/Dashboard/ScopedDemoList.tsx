import { ChevronDown, ExternalLink, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConsolePanel, DataValue, StatusBadge, type StatusBadgeVariant } from '@/components/Console'
import type { DemoSummaryDto, DemoStatus } from '@/lib/types'

interface ScopedDemoListProps {
  demos: DemoSummaryDto[]
  total: number
  hasMore: boolean
  isLoading?: boolean
  error?: string | null
  onDemoSelect: (demoId: string) => void
  onLoadMore: () => void
  loadMoreDisabled?: boolean
}

export function ScopedDemoList({
  demos,
  total,
  hasMore,
  isLoading = false,
  error,
  onDemoSelect,
  onLoadMore,
  loadMoreDisabled = false,
}: ScopedDemoListProps) {
  return (
    <ConsolePanel
      title="Scoped demo review"
      description={`${total} demos match the current analysis scope.`}
      action={
        isLoading ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Updating scope
          </span>
        ) : null
      }
    >
      {error ? (
        <div className="rounded-lg border border-signal-high/35 bg-signal-high-bg px-4 py-3 text-sm text-signal-high">
          {error}
        </div>
      ) : isLoading && demos.length === 0 ? (
        <div className="grid gap-3" aria-label="Loading scoped demos">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg border border-border-subtle bg-surface-raised" />
          ))}
        </div>
      ) : demos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-raised px-4 py-10 text-center">
          <p className="font-medium text-foreground">No demos in this scope</p>
          <p className="mt-1 text-sm text-muted-foreground">Adjust filters or ingest another demo to review this segment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demos.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => onDemoSelect(demo.id)}
              className="grid w-full cursor-pointer gap-3 rounded-lg border border-border-subtle bg-surface-raised p-4 text-left transition hover:border-border-strong hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary sm:grid-cols-[minmax(0,1.4fr)_minmax(8rem,.8fr)_minmax(8rem,.8fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <DataValue truncate className="max-w-full">
                    {demo.id}
                  </DataValue>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <time
                  dateTime={demo.uploadedAt}
                  title={new Date(demo.uploadedAt).toLocaleString()}
                  className="mt-2 block text-xs text-muted-foreground"
                >
                  {relativeTime(demo.uploadedAt)}
                </time>
              </div>

              <div className="flex flex-wrap items-start gap-2 sm:block">
                <div className="text-xs font-medium uppercase text-muted-foreground">Map</div>
                <div className="mt-1">
                  <StatusBadge variant="provenance" label={demo.map ?? 'Unknown map'} />
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-2 sm:block">
                <div className="text-xs font-medium uppercase text-muted-foreground">TRACE preview</div>
                <div className="mt-1">
                  {demo.traceAdjusted == null ? (
                    <StatusBadge variant="trace-unavailable" label="Pending" />
                  ) : (
                    <DataValue>{demo.traceAdjusted.toFixed(2)}</DataValue>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {demo.outcome && <StatusBadge variant="neutral" label={demo.outcome} />}
                <StatusBadge variant={statusVariant(demo.status)} />
              </div>
            </button>
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                onClick={onLoadMore}
                disabled={loadMoreDisabled}
                className="gap-2"
              >
                <ChevronDown className="size-4" aria-hidden />
                Load more demos
              </Button>
            </div>
          )}
        </div>
      )}
    </ConsolePanel>
  )
}

function statusVariant(status: DemoStatus): StatusBadgeVariant {
  if (status === 'done') return 'demo-done'
  if (status === 'error') return 'demo-error'
  return 'demo-pending'
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Unknown upload time'

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000)
  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  for (const [unit, seconds] of divisions) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit)
    }
  }

  return rtf.format(diffSeconds, 'second')
}
