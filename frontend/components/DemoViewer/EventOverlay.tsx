'use client'

import type { DemoEventsResponseDto, DemoRoundDto } from '@/lib/types'

export interface TimelineMarker {
  id: string
  tick: number
  kind: 'kill' | 'suspicious' | 'bomb'
  label: string
  percent: number
}

export function buildTimelineMarkers(
  events: DemoEventsResponseDto | undefined,
  rounds: DemoRoundDto[],
  startTick: number,
  endTick: number
): TimelineMarker[] {
  const span = Math.max(endTick - startTick, 1)
  const markers: TimelineMarker[] = []

  events?.kills?.forEach((kill, index) => {
    const reasons = kill.review_signal.flag_reasons
    markers.push({
      id: `kill-${kill.tick}-${index}`,
      tick: kill.tick,
      kind: reasons.length > 0 ? 'suspicious' : 'kill',
      label: `${kill.attacker.name ?? kill.attacker.steam_id} -> ${kill.victim.name ?? kill.victim.steam_id}`,
      percent: ((kill.tick - startTick) / span) * 100,
    })
  })

  rounds.forEach((round) => {
    if (!round.bomb_planted) return
    markers.push({
      id: `bomb-${round.round_number}`,
      tick: round.first_kill_tick ?? round.start_tick,
      kind: 'bomb',
      label: `Round ${round.round_number} bomb plant`,
      percent: (((round.first_kill_tick ?? round.start_tick) - startTick) / span) * 100,
    })
  })

  return markers.filter((marker) => marker.percent >= 0 && marker.percent <= 100)
}

export function EventOverlayLegend() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
      <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rotate-45 bg-red-500" /> Kill</span>
      <span className="inline-flex items-center gap-1"><i className="h-0 w-0 border-l-[5px] border-r-[5px] border-b-[9px] border-l-transparent border-r-transparent border-b-red-300" /> Review</span>
      <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-300" /> Bomb</span>
    </div>
  )
}
