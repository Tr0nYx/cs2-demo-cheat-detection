'use client'

import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { DemoEventsResponseDto, DemoRoundDto } from '@/lib/types'
import type { PlaybackSpeed } from '@/lib/hooks/usePlayback'
import { buildTimelineMarkers, EventOverlayLegend } from './EventOverlay'

interface TimelineProps {
  rounds: DemoRoundDto[]
  events?: DemoEventsResponseDto
  tick: number
  playing: boolean
  speed: PlaybackSpeed
  onPlay: () => void
  onPause: () => void
  onSeek: (tick: number) => void
  onSpeed: (speed: PlaybackSpeed) => void
}

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4]

export function Timeline({ rounds, events, tick, playing, speed, onPlay, onPause, onSeek, onSpeed }: TimelineProps) {
  const [hover, setHover] = useState<{ x: number; tick: number; label: string } | null>(null)
  const startTick = rounds[0]?.start_tick ?? 0
  const endTick = rounds[rounds.length - 1]?.end_tick ?? 1
  const span = Math.max(endTick - startTick, 1)
  const markers = buildTimelineMarkers(events, rounds, startTick, endTick)
  const tickPercent = ((tick - startTick) / span) * 100

  return (
    <div className="h-32 border-t border-zinc-800 bg-zinc-950 px-4 py-3" data-testid="demo-timeline">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playing ? onPause : onPlay}
            className="grid h-9 w-9 place-items-center rounded border border-zinc-700 bg-zinc-900 text-zinc-100"
            aria-label={playing ? 'Pause playback' : 'Play playback'}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="grid grid-cols-4 overflow-hidden rounded border border-zinc-700">
            {SPEEDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSpeed(item)}
                className={`h-9 w-12 text-xs ${speed === item ? 'bg-cyan-300 text-zinc-950' : 'bg-zinc-900 text-zinc-300'}`}
              >
                {item}x
              </button>
            ))}
          </div>
        </div>
        <EventOverlayLegend />
      </div>

      <div
        className="relative h-12 cursor-pointer rounded bg-zinc-900"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
          const hoveredTick = Math.round(startTick + percent * span)
          const round = rounds.find((item) => hoveredTick >= item.start_tick && hoveredTick <= item.end_tick)
          const marker = markers.find((item) => Math.abs(item.tick - hoveredTick) < 16)
          setHover({
            x: event.clientX - rect.left,
            tick: hoveredTick,
            label: marker?.label ?? (round ? `Round ${round.round_number}` : 'Timeline'),
          })
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const percent = (event.clientX - rect.left) / rect.width
          onSeek(Math.round(startTick + percent * span))
        }}
      >
        {rounds.map((round) => (
          <div
            key={round.round_number}
            className={`absolute top-0 h-full border-r border-zinc-950/70 ${round.winner === 'T' ? 'bg-amber-500/20' : 'bg-sky-500/20'}`}
            style={{
              left: `${((round.start_tick - startTick) / span) * 100}%`,
              width: `${((round.end_tick - round.start_tick) / span) * 100}%`,
            }}
            title={`Round ${round.round_number}`}
          />
        ))}
        {markers.map((marker) => (
          <span
            key={marker.id}
            title={marker.label}
            className={`absolute top-4 block -translate-x-1/2 ${
              marker.kind === 'suspicious'
                ? 'h-0 w-0 border-l-[6px] border-r-[6px] border-b-[11px] border-l-transparent border-r-transparent border-b-red-200'
                : marker.kind === 'bomb'
                  ? 'h-3 w-3 rounded-full bg-amber-300'
                  : 'h-3 w-3 rotate-45 bg-red-500'
            }`}
            style={{ left: `${marker.percent}%` }}
          />
        ))}
        <span
          className="absolute top-0 h-full w-0.5 bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.75)]"
          style={{ left: `${Math.min(Math.max(tickPercent, 0), 100)}%` }}
        />
        {hover && (
          <div
            className="pointer-events-none absolute -top-12 min-w-32 -translate-x-1/2 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200 shadow-xl"
            style={{ left: hover.x }}
          >
            <div className="font-mono text-cyan-200">tick {hover.tick}</div>
            <div className="truncate">{hover.label}</div>
          </div>
        )}
      </div>
    </div>
  )
}
