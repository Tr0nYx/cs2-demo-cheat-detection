'use client'

import type { DemoTickPlayerDto } from '@/lib/types'

interface PlayerLegendProps {
  players: DemoTickPlayerDto[]
  selectedPlayers: string[]
  onTogglePlayer: (steamId: string) => void
}

export function PlayerLegend({ players, selectedPlayers, onTogglePlayer }: PlayerLegendProps) {
  const uniquePlayers = Array.from(new Map(players.map((player) => [player.steam_id, player])).values())

  return (
    <div className="space-y-2" aria-label="Player visibility">
      {uniquePlayers.map((player) => {
        const checked = selectedPlayers.length === 0 || selectedPlayers.includes(player.steam_id)
        const teamColor = player.team === 'T' ? 'bg-amber-400' : 'bg-sky-400'

        return (
          <label
            key={player.steam_id}
            className="flex h-9 items-center gap-2 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onTogglePlayer(player.steam_id)}
              className="h-3.5 w-3.5"
            />
            <span className={`h-2.5 w-2.5 rounded-full ${teamColor}`} />
            <span className="min-w-0 flex-1 truncate">{player.name ?? player.steam_id}</span>
          </label>
        )
      })}
    </div>
  )
}
