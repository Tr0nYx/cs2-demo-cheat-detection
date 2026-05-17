'use client'

import { Crosshair, Skull } from 'lucide-react'
import type { DemoKillEventDto, DemoRoundDto } from '@/lib/types'

interface SuspicionPanelProps {
  kills: DemoKillEventDto[]
  rounds: DemoRoundDto[]
  onReview: (tick: number) => void
}

export function SuspicionPanel({ kills, rounds, onReview }: SuspicionPanelProps) {
  const flagged = kills
    .filter((kill) => kill.review_signal.flag_reasons.length > 0)
    .sort((a, b) => a.tick - b.tick)

  return (
    <section className="space-y-3" data-testid="suspicion-panel">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Review Signals</div>
      {flagged.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
          No flagged kill review signals.
        </div>
      ) : (
        flagged.map((kill) => {
          const round = rounds.find((item) => item.round_number === kill.round_number)
          const reviewTick = Math.max(round?.start_tick ?? 0, kill.tick - 32)
          const score = kill.review_signal.suspicion_score

          return (
            <article key={`${kill.tick}-${kill.attacker.steam_id}-${kill.victim.steam_id}`} className="rounded border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">
                    {kill.attacker.name ?? kill.attacker.steam_id}
                  </div>
                  <div className="truncate text-xs text-zinc-400">
                    vs {kill.victim.name ?? kill.victim.steam_id}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-300">
                  {kill.headshot && <Skull className="h-4 w-4 text-red-300" />}
                  <span>{kill.weapon ?? 'weapon'}</span>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded bg-zinc-800">
                <div className="h-full bg-red-300" style={{ width: `${Math.round(score * 100)}%` }} />
              </div>
              <div className="mt-1 font-mono text-[11px] text-zinc-400">{Math.round(score * 100)} review score</div>

              <div className="mt-3 flex flex-wrap gap-1">
                {kill.review_signal.flag_reasons.map((reason) => (
                  <span key={reason} className="rounded border border-red-300/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-200">
                    {reason}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onReview(reviewTick)}
                className="mt-3 inline-flex h-8 items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs font-semibold text-zinc-100"
              >
                <Crosshair className="h-4 w-4" />
                Review
              </button>
            </article>
          )
        })
      )}
    </section>
  )
}
