'use client'

import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { demoHeatmapUrl } from '@/lib/api'
import type { DemoRoundDto, DemoTickPlayerDto, HeatmapType } from '@/lib/types'

interface HeatmapViewerProps {
  demoId: string
  players: DemoTickPlayerDto[]
  rounds: DemoRoundDto[]
}

const HEATMAPS: Array<{ type: HeatmapType; label: string }> = [
  { type: 'kills', label: 'Kills' },
  { type: 'deaths', label: 'Deaths' },
  { type: 'damage', label: 'Damage Dealt' },
  { type: 'taken', label: 'Damage Taken' },
  { type: 'grenades', label: 'Grenades' },
]

export function HeatmapViewer({ demoId, players, rounds }: HeatmapViewerProps) {
  const [type, setType] = useState<HeatmapType>('kills')
  const [player, setPlayer] = useState('')
  const [roundMode, setRoundMode] = useState('all')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const uniquePlayers = Array.from(new Map(players.map((item) => [item.steam_id, item])).values())
  const roundParams = useMemo(() => resolveRoundMode(roundMode, rounds), [roundMode, rounds])
  const src = demoHeatmapUrl(demoId, {
    type,
    player: player || undefined,
    roundFrom: roundParams.roundFrom,
    roundTo: roundParams.roundTo,
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]" data-testid="heatmap-viewer">
      <aside className="space-y-3">
        <div className="grid grid-cols-1 gap-1">
          {HEATMAPS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                setType(item.type)
                setLoading(true)
                setFailed(false)
              }}
              className={`h-9 rounded border px-3 text-left text-xs font-semibold ${
                type === item.type ? 'border-cyan-300 bg-cyan-300 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          value={player}
          onChange={(event) => {
            setPlayer(event.target.value)
            setLoading(true)
            setFailed(false)
          }}
          className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
          aria-label="Heatmap player filter"
        >
          <option value="">All players</option>
          {uniquePlayers.map((item) => (
            <option key={item.steam_id} value={item.steam_id}>
              {item.name ?? item.steam_id}
            </option>
          ))}
        </select>

        <select
          value={roundMode}
          onChange={(event) => {
            setRoundMode(event.target.value)
            setLoading(true)
            setFailed(false)
          }}
          className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
          aria-label="Heatmap round filter"
        >
          <option value="all">All rounds</option>
          <option value="first">First half</option>
          <option value="second">Second half</option>
          {rounds.map((round) => (
            <option key={round.round_number} value={`round:${round.round_number}`}>
              Round {round.round_number}
            </option>
          ))}
        </select>

        <a
          href={src}
          download
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-100"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </aside>

      <div className="relative aspect-square min-h-[360px] overflow-hidden rounded border border-zinc-800 bg-zinc-950">
        {loading && <div className="absolute inset-0 animate-pulse bg-zinc-900" />}
        {failed && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-950 text-sm text-zinc-400">
            Generating
          </div>
        )}
        <img
          key={src}
          src={src}
          alt=""
          className="h-full w-full object-contain"
          onLoad={() => {
            setLoading(false)
            setFailed(false)
          }}
          onError={() => {
            setLoading(false)
            setFailed(true)
          }}
        />
      </div>
    </div>
  )
}

function resolveRoundMode(mode: string, rounds: DemoRoundDto[]) {
  if (mode === 'all' || rounds.length === 0) return {}
  const midpoint = Math.ceil(rounds.length / 2)
  if (mode === 'first') {
    return { roundFrom: rounds[0].round_number, roundTo: rounds[midpoint - 1].round_number }
  }
  if (mode === 'second') {
    return { roundFrom: rounds[midpoint].round_number, roundTo: rounds[rounds.length - 1].round_number }
  }
  if (mode.startsWith('round:')) {
    const round = Number(mode.slice(6))
    return { roundFrom: round, roundTo: round }
  }
  return {}
}
