import { act, renderHook } from '@testing-library/react'
import {
  mapRadarToWorld,
  mapWorldToRadar,
  useMapTransform,
} from '@/lib/hooks/useMapTransform'

describe('useMapTransform', () => {
  it('mirrors Python world/radar transform math', () => {
    const radar = mapWorldToRadar(-2476, 3239, 'de_dust2')
    expect(radar).toEqual({ x: 0, y: 0 })

    const world = mapRadarToWorld(radar.x, radar.y, 'de_dust2')
    expect(world.x).toBeCloseTo(-2476)
    expect(world.y).toBeCloseTo(3239)
  })

  it('round-trips canvas coordinates through world coordinates', () => {
    const { result } = renderHook(() =>
      useMapTransform({ mapName: 'de_mirage', canvasSize: { width: 512, height: 512 } })
    )

    const canvas = result.current.worldToCanvas(-3230, 1713)
    const world = result.current.canvasToWorld(canvas.x, canvas.y)

    expect(world.x).toBeCloseTo(-3230)
    expect(world.y).toBeCloseTo(1713)
  })

  it('tracks zoom and pan state', () => {
    const { result } = renderHook(() =>
      useMapTransform({ mapName: 'de_dust2', canvasSize: { width: 1024, height: 1024 } })
    )

    act(() => result.current.panBy(10, 20))
    expect(result.current.pan).toEqual({ x: 10, y: 20 })

    act(() => result.current.zoomBy(2, { x: 0, y: 0 }))
    expect(result.current.zoom).toBe(2)
    expect(result.current.pan).toEqual({ x: 20, y: 40 })

    act(() => result.current.reset())
    expect(result.current.zoom).toBe(1)
    expect(result.current.pan).toEqual({ x: 0, y: 0 })
  })
})
