import type { ReactNode } from 'react'
import { CalendarClock, Database, FileText, Link as LinkIcon, MapPin } from 'lucide-react'

import { ConsolePanel, DataValue, StatusBadge } from '@/components/Console'
import type { MatchSummaryDto } from '@/lib/types'

type MatchHeaderProps = {
  summary: MatchSummaryDto
  actions?: ReactNode
}

export function MatchHeader({ summary, actions }: MatchHeaderProps) {
  const title = summary.map ? `${summary.map} match report` : 'Match report'
  const score = summary.score

  return (
    <ConsolePanel
      title={
        <div className="flex flex-wrap items-center gap-2">
          <MapPin className="size-4 text-trace-primary" aria-hidden />
          <span>{title}</span>
        </div>
      }
      description={
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>Demo ID:</span>
          <DataValue>{summary.demoId || 'Unavailable'}</DataValue>
        </div>
      }
      action={actions}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetaItem icon={<Database className="size-4" />} label="Analysis status">
            <StatusBadge variant={statusVariant(summary.status)} />
          </MetaItem>
          <MetaItem icon={<CalendarClock className="size-4" />} label="Uploaded">
            {formatDateTime(summary.uploadedAt)}
          </MetaItem>
          <MetaItem icon={<CalendarClock className="size-4" />} label="Processed">
            {formatDateTime(summary.processedAt)}
          </MetaItem>
          <MetaItem icon={<FileText className="size-4" />} label="Source file">
            <DataValue truncate>{summary.originalFilename ?? 'Unavailable'}</DataValue>
          </MetaItem>
          <MetaItem icon={<Database className="size-4" />} label="Provenance">
            {summary.sourcePlatform ?? summary.sharecode ?? 'Unavailable'}
          </MetaItem>
          <MetaItem icon={<LinkIcon className="size-4" />} label="External match">
            {summary.hltvMatchUrl ? (
              <a
                className="font-medium text-trace-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
                href={summary.hltvMatchUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open reference
              </a>
            ) : (
              summary.steamMatchId ?? 'Unavailable'
            )}
          </MetaItem>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</div>
          {score ? (
            <div className="mt-3 flex items-end justify-between gap-4">
              <ScoreSide label={score.teamAName ?? 'Team A'} value={score.teamA} />
              <div className="pb-1 text-lg font-semibold text-muted-foreground">:</div>
              <ScoreSide label={score.teamBName ?? 'Team B'} value={score.teamB} align="right" />
            </div>
          ) : (
            <div className="mt-3">
              <p className="font-heading text-lg font-semibold text-foreground">Score unavailable</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {summary.scoreUnavailableReason ?? 'The current payload does not include score data.'}
              </p>
            </div>
          )}
          {summary.outcome && (
            <div className="mt-4">
              <StatusBadge variant="provenance" label={`Outcome: ${summary.outcome}`} />
            </div>
          )}
        </div>
      </div>
    </ConsolePanel>
  )
}

function MetaItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-h-20 rounded-lg border border-border-subtle bg-surface-raised p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 min-w-0 text-sm text-foreground">{children}</div>
    </div>
  )
}

function ScoreSide({ label, value, align = 'left' }: { label: string; value: number; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <div className="max-w-28 truncate text-xs font-medium text-muted-foreground">{label}</div>
      <div className="font-heading text-4xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function statusVariant(status: MatchSummaryDto['status']) {
  if (status === 'done') return 'demo-done'
  if (status === 'error') return 'demo-error'
  return 'demo-pending'
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Unavailable'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
