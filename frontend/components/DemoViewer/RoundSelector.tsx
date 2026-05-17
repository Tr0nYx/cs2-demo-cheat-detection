'use client'

import type { DemoRoundDto } from '@/lib/types'

interface RoundSelectorProps {
  rounds: DemoRoundDto[]
  selectedRound?: number
  onSelectRound: (round: number) => void
}

export function RoundSelector({ rounds, selectedRound, onSelectRound }: RoundSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-1" aria-label="Round selector">
      {rounds.map((round) => (
        <button
          key={round.round_number}
          type="button"
          onClick={() => onSelectRound(round.round_number)}
          className={`h-8 rounded border text-xs font-semibold transition ${
            selectedRound === round.round_number
              ? 'border-cyan-300 bg-cyan-300 text-zinc-950'
              : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
          }`}
          title={`Round ${round.round_number}`}
        >
          {round.round_number}
        </button>
      ))}
    </div>
  )
}
