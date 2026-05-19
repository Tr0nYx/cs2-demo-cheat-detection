import { ExternalLink } from 'lucide-react'

import { DataValue, StatusBadge, type StatusBadgeVariant } from '@/components/Console'
import type { MatchParticipantDto } from '@/lib/types'
import { MatchEmptyState } from './MatchEmptyState'

type MatchParticipantTableProps = {
  participants: MatchParticipantDto[]
}

export function MatchParticipantTable({ participants }: MatchParticipantTableProps) {
  if (participants.length === 0) {
    return (
      <MatchEmptyState
        title="No participants in this payload"
        description="The match report can still show available metadata, rounds, events, and viewer access when player rows are absent."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-lg border border-border-subtle md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised">
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">Team</th>
              <th className="px-4 py-3 font-semibold">Overall review signal</th>
              <th className="px-4 py-3 font-semibold">Verdict label</th>
              <th className="px-4 py-3 font-semibold">Top research signals</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.steamId || participant.name} className="border-b border-border-subtle last:border-0">
                <td className="px-4 py-3">
                  <PlayerCell participant={participant} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{participant.team ?? 'Unavailable'}</td>
                <td className="px-4 py-3">
                  <SignalScore participant={participant} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge variant={verdictVariant(participant.overallVerdict)} label={verdictLabel(participant.overallVerdict)} />
                </td>
                <td className="px-4 py-3">
                  <FeatureSignals participant={participant} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {participants.map((participant) => (
          <div key={participant.steamId || participant.name} className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <PlayerCell participant={participant} />
              <StatusBadge variant={verdictVariant(participant.overallVerdict)} label={verdictLabel(participant.overallVerdict)} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</dt>
                <dd className="mt-1 text-foreground">{participant.team ?? 'Unavailable'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review signal</dt>
                <dd className="mt-1">
                  <SignalScore participant={participant} />
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <FeatureSignals participant={participant} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerCell({ participant }: { participant: MatchParticipantDto }) {
  const content = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate font-medium text-foreground">{participant.name}</span>
      {participant.profileHref && <ExternalLink className="size-3.5 shrink-0" aria-hidden />}
    </span>
  )

  return (
    <div className="min-w-0">
      {participant.profileHref ? (
        <a
          href={participant.profileHref}
          className="inline-flex max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
        >
          {content}
        </a>
      ) : (
        content
      )}
      <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
        <DataValue>{participant.steamId || 'No Steam ID'}</DataValue>
      </div>
    </div>
  )
}

function SignalScore({ participant }: { participant: MatchParticipantDto }) {
  if (participant.overallScore === null) return <span className="text-muted-foreground">Unavailable</span>

  return (
    <span className="font-mono font-semibold text-foreground">
      {Math.round(participant.overallScore)}/100
    </span>
  )
}

function FeatureSignals({ participant }: { participant: MatchParticipantDto }) {
  const features = [...participant.features]
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)

  if (features.length === 0) {
    return <span className="text-sm text-muted-foreground">No feature research signals</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {features.map((feature) => (
        <span
          key={feature.name}
          className="inline-flex h-6 items-center rounded-full border border-border-subtle bg-surface-panel px-2 text-xs text-muted-foreground"
        >
          {feature.name}: {Math.round(feature.score)}
        </span>
      ))}
    </div>
  )
}

function verdictVariant(verdict: MatchParticipantDto['overallVerdict']): StatusBadgeVariant {
  if (verdict === 'likely_cheating') return 'suspicion-high'
  if (verdict === 'suspicious') return 'suspicion-review'
  return 'suspicion-clean'
}

function verdictLabel(verdict: MatchParticipantDto['overallVerdict']): string {
  if (verdict === 'likely_cheating') return 'High review signal'
  if (verdict === 'suspicious') return 'Review signal'
  return 'Low review signal'
}
