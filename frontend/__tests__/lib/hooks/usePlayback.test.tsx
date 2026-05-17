import { act, renderHook } from '@testing-library/react'
import { usePlayback } from '@/lib/hooks/usePlayback'
import type { DemoRoundDto } from '@/lib/types'

const rounds: DemoRoundDto[] = [
  {
    round_number: 1,
    start_tick: 100,
    end_tick: 200,
    winner: 'CT',
    end_reason: 'elimination',
    duration_ms: 10000,
    kills: 5,
    first_kill_tick: 120,
    bomb_planted: false,
  },
  {
    round_number: 2,
    start_tick: 300,
    end_tick: 420,
    winner: 'T',
    end_reason: 'bomb_exploded',
    duration_ms: 12000,
    kills: 4,
    first_kill_tick: 330,
    bomb_planted: true,
  },
]

describe('usePlayback', () => {
  let frames: FrameRequestCallback[] = []

  beforeEach(() => {
    frames = []
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('supports play, pause, speed, and frame advancement', () => {
    const { result } = renderHook(() => usePlayback({ rounds, initialTick: 100 }))

    act(() => {
      result.current.setSpeed(2)
      result.current.play()
    })

    act(() => frames.shift()?.(0))
    act(() => frames.shift()?.(1000))

    expect(result.current.tick).toBe(200)
    expect(result.current.playing).toBe(false)

    act(() => result.current.pause())
    expect(result.current.playing).toBe(false)
  })

  it('clamps seek to the active round', () => {
    const { result } = renderHook(() => usePlayback({ rounds, initialTick: 100 }))

    act(() => result.current.seek(500))

    expect(result.current.tick).toBe(200)
  })

  it('navigates next and previous rounds', () => {
    const { result } = renderHook(() => usePlayback({ rounds, initialTick: 100 }))

    act(() => result.current.nextRound())
    expect(result.current.tick).toBe(300)
    expect(result.current.round?.round_number).toBe(2)

    act(() => result.current.prevRound())
    expect(result.current.tick).toBe(100)
    expect(result.current.round?.round_number).toBe(1)
  })
})
