import { ConsolePanel, DataValue } from '@/components/Console'
import type { DemoRoundDto } from '@/lib/types'
import { MatchEmptyState } from './MatchEmptyState'

type MatchRoundsSectionProps = {
  rounds: DemoRoundDto[]
}

export function MatchRoundsSection({ rounds }: MatchRoundsSectionProps) {
  return (
    <ConsolePanel
      title="Rounds"
      description="Round summaries from the existing viewer API, shown as match-review context."
    >
      {rounds.length === 0 ? (
        <MatchEmptyState
          title="Round timeline unavailable"
          description="This analysis payload does not include round summaries yet. Viewer data may still generate after analysis completes."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Round</th>
                <th className="px-4 py-3 font-semibold">Winner</th>
                <th className="px-4 py-3 font-semibold">End reason</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Kills</th>
                <th className="px-4 py-3 font-semibold">First kill tick</th>
                <th className="px-4 py-3 font-semibold">Bomb plant</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <tr key={round.round_number} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">#{round.round_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{round.winner ?? 'Unavailable'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{round.end_reason ?? 'Unavailable'}</td>
                  <td className="px-4 py-3">
                    <DataValue>{formatDuration(round.duration_ms)}</DataValue>
                  </td>
                  <td className="px-4 py-3 text-foreground">{round.kills}</td>
                  <td className="px-4 py-3 text-muted-foreground">{round.first_kill_tick ?? 'Unavailable'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{round.bomb_planted ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ConsolePanel>
  )
}

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 'Unavailable'
  const seconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
