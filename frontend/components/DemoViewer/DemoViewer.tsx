'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers, Map } from 'lucide-react'
import { useDemoEvents } from '@/lib/hooks/useDemoEvents'
import { useDemoRounds } from '@/lib/hooks/useDemoRounds'
import { usePlayback } from '@/lib/hooks/usePlayback'
import { useTickData } from '@/lib/hooks/useTickData'
import { MapCanvas } from './MapCanvas'
import { Timeline } from './Timeline'
import { RoundSelector } from './RoundSelector'
import { PlayerLegend } from './PlayerLegend'
import { HeatmapViewer } from './HeatmapViewer'
import { SuspicionPanel } from './SuspicionPanel'
import { GrenadeInspector } from './GrenadeInspector'

interface DemoViewerProps {
  demoId: string
  mapName?: string
  analyzed?: boolean
}

export function DemoViewer({ demoId, mapName = 'de_dust2', analyzed = true }: DemoViewerProps) {
  const [mode, setMode] = useState<'viewer' | 'heatmap'>('viewer')
  const [selectedRound, setSelectedRound] = useState<number | undefined>(1)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const roundsQuery = useDemoRounds(demoId)
  const rounds = roundsQuery.data?.rounds ?? []
  const eventsQuery = useDemoEvents(demoId, { type: 'all', round: selectedRound })
  const playback = usePlayback({ rounds, initialTick: rounds[0]?.start_tick })
  const tickQuery = useTickData(demoId, {
    round: selectedRound,
    players: selectedPlayers,
    fromTick: Math.floor(playback.tick),
  })
  const ticks = tickQuery.data?.ticks ?? []
  const currentTick = useMemo(
    () => ticks.find((item) => item.tick >= playback.tick) ?? ticks[0],
    [playback.tick, ticks]
  )
  const players = useMemo(() => currentTick?.players ?? ticks.flatMap((item) => item.players), [currentTick?.players, ticks])
  const selectedRoundData = rounds.find((round) => round.round_number === selectedRound) ?? rounds[0]
  const visiblePlayerCount = selectedPlayers.length === 0 ? players.length : selectedPlayers.length

  useEffect(() => {
    if (rounds[0] && playback.tick === 0) {
      playback.seek(rounds[0].start_tick)
    }
  }, [playback, rounds])

  if (!analyzed) {
    return (
      <section className="w-full border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
        Viewer data becomes available after analysis completes.
      </section>
    )
  }

  if (roundsQuery.isLoading) {
    return <section className="h-[620px] w-full animate-pulse bg-zinc-900" />
  }

  if (roundsQuery.error) {
    return <section className="w-full border border-red-900 bg-red-950/30 p-6 text-sm text-red-200">Viewer data unavailable.</section>
  }

  return (
    <section className="w-full overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100" data-testid="demo-viewer">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('viewer')}
            className={`inline-flex h-9 items-center gap-2 rounded border px-3 text-xs font-semibold ${mode === 'viewer' ? 'border-cyan-300 bg-cyan-300 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
          >
            <Map className="h-4 w-4" />
            Viewer
          </button>
          <button
            type="button"
            onClick={() => setMode('heatmap')}
            className={`inline-flex h-9 items-center gap-2 rounded border px-3 text-xs font-semibold ${mode === 'heatmap' ? 'border-cyan-300 bg-cyan-300 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
          >
            <Layers className="h-4 w-4" />
            Heatmap
          </button>
        </div>
        <div className="font-mono text-xs text-zinc-400">
          tick {Math.floor(playback.tick)} {tickQuery.isGenerating ? 'cache pending' : ''}
        </div>
      </div>

      <div className="grid min-h-[680px] gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 p-4">
          {mode === 'viewer' ? (
            <MapCanvas mapName={mapName} tick={currentTick} events={eventsQuery.data} />
          ) : (
            <HeatmapViewer demoId={demoId} players={players} rounds={rounds} />
          )}
        </main>
        <aside className="border-t border-zinc-800 p-4 lg:border-l lg:border-t-0">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Metric label="Round" value={selectedRoundData?.round_number ?? '-'} />
            <Metric label="Players" value={visiblePlayerCount} />
            <Metric label="Start" value={selectedRoundData?.start_tick ?? '-'} />
            <Metric label="End" value={selectedRoundData?.end_tick ?? '-'} />
          </div>
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Rounds</div>
          <RoundSelector
            rounds={rounds}
            selectedRound={selectedRound}
            onSelectRound={(round) => {
              setSelectedRound(round)
              playback.seek(rounds.find((item) => item.round_number === round)?.start_tick ?? playback.tick)
            }}
          />
          <div className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Players</div>
          <PlayerLegend
            players={players}
            selectedPlayers={selectedPlayers}
            onTogglePlayer={(steamId) =>
              setSelectedPlayers((current) =>
                current.includes(steamId) ? current.filter((item) => item !== steamId) : [...current, steamId]
              )
            }
          />
          <div className="mt-5">
            <SuspicionPanel
              kills={eventsQuery.data?.kills ?? []}
              rounds={rounds}
              onReview={(tick) => playback.seek(tick)}
            />
          </div>
          <div className="mt-5">
            <GrenadeInspector
              grenades={eventsQuery.data?.grenades ?? []}
              onSeek={(tick) => playback.seek(tick)}
            />
          </div>
        </aside>
      </div>

      <Timeline
        rounds={rounds}
        events={eventsQuery.data}
        tick={Math.floor(playback.tick)}
        playing={playback.playing}
        speed={playback.speed}
        onPlay={playback.play}
        onPause={playback.pause}
        onSeek={playback.seek}
        onSpeed={playback.setSpeed}
      />
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="h-14 rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-zinc-100">{value}</div>
    </div>
  )
}
