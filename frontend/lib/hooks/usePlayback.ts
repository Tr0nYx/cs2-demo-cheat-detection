'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DemoRoundDto } from '@/lib/types'

export type PlaybackSpeed = 0.5 | 1 | 2 | 4

export interface UsePlaybackOptions {
  rounds: DemoRoundDto[]
  initialTick?: number
}

export interface PlaybackState {
  tick: number
  playing: boolean
  speed: PlaybackSpeed
  round: DemoRoundDto | null
}

export function usePlayback({ rounds, initialTick }: UsePlaybackOptions) {
  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  )
  const firstRound = orderedRounds[0] ?? null
  const [tick, setTick] = useState(initialTick ?? firstRound?.start_tick ?? 0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState<PlaybackSpeed>(1)
  const frameRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)

  const activeRound = useMemo(
    () =>
      orderedRounds.find((round) => tick >= round.start_tick && tick <= round.end_tick) ??
      firstRound,
    [firstRound, orderedRounds, tick]
  )

  const clampToRound = useCallback(
    (nextTick: number, round = activeRound) => {
      if (!round) return nextTick
      return Math.min(Math.max(nextTick, round.start_tick), round.end_tick)
    },
    [activeRound]
  )

  const pause = useCallback(() => setPlaying(false), [])
  const play = useCallback(() => setPlaying(true), [])
  const seek = useCallback((nextTick: number) => setTick(clampToRound(nextTick)), [clampToRound])
  const setSpeed = useCallback((nextSpeed: PlaybackSpeed) => setSpeedState(nextSpeed), [])

  const nextRound = useCallback(() => {
    if (!activeRound) return
    const index = orderedRounds.findIndex((round) => round.round_number === activeRound.round_number)
    const next = orderedRounds[Math.min(index + 1, orderedRounds.length - 1)]
    if (next) setTick(next.start_tick)
  }, [activeRound, orderedRounds])

  const prevRound = useCallback(() => {
    if (!activeRound) return
    const index = orderedRounds.findIndex((round) => round.round_number === activeRound.round_number)
    const prev = orderedRounds[Math.max(index - 1, 0)]
    if (prev) setTick(prev.start_tick)
  }, [activeRound, orderedRounds])

  useEffect(() => {
    if (!playing || !activeRound) return

    const advance = (timestamp: number) => {
      const previous = lastFrameRef.current ?? timestamp
      const elapsedMs = timestamp - previous
      lastFrameRef.current = timestamp

      setTick((current) => {
        const nextTick = current + (elapsedMs / 1000) * 64 * speed
        if (nextTick >= activeRound.end_tick) {
          setPlaying(false)
          return activeRound.end_tick
        }
        return nextTick
      })

      frameRef.current = requestAnimationFrame(advance)
    }

    frameRef.current = requestAnimationFrame(advance)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = null
      lastFrameRef.current = null
    }
  }, [activeRound, playing, speed])

  const state: PlaybackState = {
    tick,
    playing,
    speed,
    round: activeRound,
  }

  return {
    ...state,
    play,
    pause,
    seek,
    setSpeed,
    nextRound,
    prevRound,
  }
}
