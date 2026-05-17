'use client'

import { useCallback, useMemo, useState } from 'react'

interface MapConfig {
  posX: number
  posY: number
  scale: number
  radarWidth: number
  radarHeight: number
}

export const MAP_CONFIGS: Record<string, MapConfig> = {
  de_dust2: { posX: -2476, posY: 3239, scale: 4.4, radarWidth: 1024, radarHeight: 1024 },
  de_mirage: { posX: -3230, posY: 1713, scale: 5.0, radarWidth: 1024, radarHeight: 1024 },
  de_inferno: { posX: -2087, posY: 3870, scale: 4.9, radarWidth: 1024, radarHeight: 1024 },
  de_nuke: { posX: -3453, posY: 2887, scale: 7.0, radarWidth: 1024, radarHeight: 1024 },
  de_ancient: { posX: -2953, posY: 2164, scale: 5.0, radarWidth: 1024, radarHeight: 1024 },
  de_anubis: { posX: -2796, posY: 3328, scale: 5.22, radarWidth: 1024, radarHeight: 1024 },
  de_vertigo: { posX: -3168, posY: 1762, scale: 4.0, radarWidth: 1024, radarHeight: 1024 },
}

export interface CanvasSize {
  width: number
  height: number
}

export interface UseMapTransformOptions {
  mapName: string
  canvasSize: CanvasSize
}

export function mapWorldToRadar(x: number, y: number, mapName: string) {
  const cfg = MAP_CONFIGS[mapName]
  if (!cfg) throw new Error(`Unsupported map: ${mapName}`)
  return {
    x: (x - cfg.posX) / cfg.scale,
    y: (cfg.posY - y) / cfg.scale,
  }
}

export function mapRadarToWorld(px: number, py: number, mapName: string) {
  const cfg = MAP_CONFIGS[mapName]
  if (!cfg) throw new Error(`Unsupported map: ${mapName}`)
  return {
    x: px * cfg.scale + cfg.posX,
    y: cfg.posY - py * cfg.scale,
  }
}

export function useMapTransform({ mapName, canvasSize }: UseMapTransformOptions) {
  const cfg = MAP_CONFIGS[mapName] ?? MAP_CONFIGS.de_dust2
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const fitScale = useMemo(
    () => Math.min(canvasSize.width / cfg.radarWidth, canvasSize.height / cfg.radarHeight),
    [canvasSize.height, canvasSize.width, cfg.radarHeight, cfg.radarWidth]
  )

  const worldToCanvas = useCallback(
    (x: number, y: number) => {
      const radar = mapWorldToRadar(x, y, mapName)
      return {
        x: radar.x * fitScale * zoom + pan.x,
        y: radar.y * fitScale * zoom + pan.y,
      }
    },
    [fitScale, mapName, pan.x, pan.y, zoom]
  )

  const canvasToWorld = useCallback(
    (x: number, y: number) => {
      const radarX = (x - pan.x) / (fitScale * zoom)
      const radarY = (y - pan.y) / (fitScale * zoom)
      return mapRadarToWorld(radarX, radarY, mapName)
    },
    [fitScale, mapName, pan.x, pan.y, zoom]
  )

  const panBy = useCallback((dx: number, dy: number) => {
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }))
  }, [])

  const zoomBy = useCallback((factor: number, origin = { x: canvasSize.width / 2, y: canvasSize.height / 2 }) => {
    setZoom((currentZoom) => {
      const nextZoom = Math.min(Math.max(currentZoom * factor, 0.5), 8)
      const ratio = nextZoom / currentZoom
      setPan((currentPan) => ({
        x: origin.x - (origin.x - currentPan.x) * ratio,
        y: origin.y - (origin.y - currentPan.y) * ratio,
      }))
      return nextZoom
    })
  }, [canvasSize.height, canvasSize.width])

  const reset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  return {
    mapConfig: cfg,
    zoom,
    pan,
    fitScale,
    worldToCanvas,
    canvasToWorld,
    panBy,
    zoomBy,
    reset,
    setPan,
    setZoom,
  }
}
