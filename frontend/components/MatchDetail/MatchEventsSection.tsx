import { Crosshair, Flame, Skull } from 'lucide-react'
import type { ReactNode } from 'react'

import { ConsolePanel, DataValue, StatusBadge } from '@/components/Console'
import type { DemoEventsResponseDto, DemoKillEventDto } from '@/lib/types'
import { MatchEmptyState } from './MatchEmptyState'

type MatchEventsSectionProps = {
  events: DemoEventsResponseDto
  flaggedKills: DemoKillEventDto[]
}

export function MatchEventsSection({ events, flaggedKills }: MatchEventsSectionProps) {
  const kills = events.kills ?? []
  const grenades = events.grenades ?? []
  const damageCount = Array.isArray(events.damage) ? events.damage.length : 0
  const hasEvents = kills.length > 0 || grenades.length > 0 || damageCount > 0

  return (
    <ConsolePanel
      title="Events"
      description="Notable kills and utility events from the existing event endpoint."
    >
      {!hasEvents ? (
        <MatchEmptyState
          title="Event stream unavailable"
          description="The current viewer payload does not include kill, grenade, or damage events for this match."
        />
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-semibold text-foreground">Flagged kill review signals</h3>
              <StatusBadge variant={flaggedKills.length > 0 ? 'suspicion-review' : 'suspicion-clean'} label={`${flaggedKills.length} flagged`} />
            </div>
            {flaggedKills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flagged kill review signals in the current event payload.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {flaggedKills.map((kill) => (
                  <KillCard key={`${kill.tick}-${kill.attacker.steam_id}-${kill.victim.steam_id}`} kill={kill} />
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <EventMetric label="Kills" value={kills.length} icon={<Skull className="size-4" />} />
            <EventMetric label="Grenades" value={grenades.length} icon={<Flame className="size-4" />} />
            <EventMetric label="Damage entries" value={damageCount} icon={<Crosshair className="size-4" />} />
          </section>

          {grenades.length > 0 && (
            <section className="rounded-lg border border-border-subtle">
              <div className="border-b border-border-subtle bg-surface-raised px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grenade review sample
              </div>
              <div className="divide-y divide-border-subtle">
                {grenades.slice(0, 6).map((grenade) => (
                  <div key={`${grenade.tick}-${grenade.thrower.steam_id}-${grenade.type}`} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                    <span className="font-medium text-foreground">{grenade.type}</span>
                    <span className="text-muted-foreground">{grenade.thrower.name ?? grenade.thrower.steam_id}</span>
                    <span className="text-muted-foreground">Round {grenade.round_number}</span>
                    <DataValue>tick {grenade.tick}</DataValue>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </ConsolePanel>
  )
}

function KillCard({ kill }: { kill: DemoKillEventDto }) {
  return (
    <article className="rounded-lg border border-border-subtle bg-surface-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {kill.attacker.name ?? kill.attacker.steam_id}
            <span className="text-muted-foreground"> vs </span>
            {kill.victim.name ?? kill.victim.steam_id}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Round {kill.round_number} - tick {kill.tick} - {kill.weapon ?? 'weapon unavailable'}
          </p>
        </div>
        {kill.headshot && <StatusBadge variant="suspicion-review" label="Headshot" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {kill.review_signal.flag_reasons.map((reason) => (
          <span key={reason} className="rounded border border-signal-review/35 bg-signal-review-bg px-2 py-1 text-xs text-signal-review">
            {reason}
          </span>
        ))}
      </div>
    </article>
  )
}

function EventMetric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 font-heading text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
