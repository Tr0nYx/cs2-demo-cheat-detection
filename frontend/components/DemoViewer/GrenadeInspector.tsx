'use client'

import { useMemo, useState } from 'react'
import type { DemoGrenadeEventDto } from '@/lib/types'

interface GrenadeInspectorProps {
  grenades: DemoGrenadeEventDto[]
  onSeek: (tick: number) => void
}

const TYPES = ['smoke', 'flash', 'he', 'molotov', 'incendiary']

export function GrenadeInspector({ grenades, onSeek }: GrenadeInspectorProps) {
  const [type, setType] = useState('')
  const [player, setPlayer] = useState('')
  const [round, setRound] = useState('')
  const [similarTo, setSimilarTo] = useState<DemoGrenadeEventDto | null>(null)
  const players = Array.from(new Map(grenades.map((item) => [item.thrower.steam_id, item.thrower])).values())
  const rounds = Array.from(new Set(grenades.map((item) => item.round_number))).sort((a, b) => a - b)
  const filtered = useMemo(
    () =>
      grenades.filter((grenade) => {
        if (type && grenade.type !== type) return false
        if (player && grenade.thrower.steam_id !== player) return false
        if (round && grenade.round_number !== Number(round)) return false
        if (similarTo && endpointDistance(grenade, similarTo) > 100) return false
        return true
      }),
    [grenades, player, round, similarTo, type]
  )

  const grouped = filtered.reduce((acc, grenade) => {
    const current = acc.get(grenade.round_number) ?? []
    current.push(grenade)
    acc.set(grenade.round_number, current)
    return acc
  }, new Map<number, DemoGrenadeEventDto[]>())

  return (
    <section className="space-y-3" data-testid="grenade-inspector">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Grenades</div>
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100" aria-label="Grenade type filter">
          <option value="">All types</option>
          {TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={round} onChange={(event) => setRound(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100" aria-label="Grenade round filter">
          <option value="">All rounds</option>
          {rounds.map((item) => <option key={item} value={item}>R{item}</option>)}
        </select>
      </div>
      <select value={player} onChange={(event) => setPlayer(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100" aria-label="Grenade player filter">
        <option value="">All players</option>
        {players.map((item) => <option key={item.steam_id} value={item.steam_id}>{item.name ?? item.steam_id}</option>)}
      </select>

      <div className="max-h-80 space-y-3 overflow-auto pr-1">
        {Array.from(grouped.entries()).map(([roundNumber, items]) => (
          <div key={roundNumber}>
            <div className="mb-1 font-mono text-[11px] text-zinc-500">Round {roundNumber}</div>
            <div className="space-y-1">
              {items.map((grenade) => (
                <article
                  key={`${grenade.tick}-${grenade.thrower.steam_id}-${grenade.type}`}
                  className={`rounded border p-2 text-xs ${similarTo && endpointDistance(grenade, similarTo) <= 100 ? 'border-cyan-300 bg-cyan-950/30' : 'border-zinc-800 bg-zinc-950'}`}
                  onMouseEnter={() => setSimilarTo((current) => current)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-100">{grenade.type}</span>
                    <span className="font-mono text-zinc-500">tick {grenade.tick}</span>
                  </div>
                  <div className="mt-1 truncate text-zinc-400">{grenade.thrower.name ?? grenade.thrower.steam_id}</div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => onSeek(grenade.tick)} className="h-7 rounded border border-zinc-700 px-2 text-zinc-200">Seek</button>
                    <button type="button" onClick={() => setSimilarTo(grenade)} className="h-7 rounded border border-zinc-700 px-2 text-zinc-200">Find similar throws</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function endpointDistance(a: DemoGrenadeEventDto, b: DemoGrenadeEventDto): number {
  const ax = a.end_map_px ?? a.end.x ?? a.start.x
  const ay = a.end_map_py ?? a.end.y ?? a.start.y
  const bx = b.end_map_px ?? b.end.x ?? b.start.x
  const by = b.end_map_py ?? b.end.y ?? b.start.y
  return Math.hypot(ax - bx, ay - by)
}
