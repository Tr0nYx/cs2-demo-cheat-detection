'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DemoEventsResponseDto, DemoTickDto } from '@/lib/types'
import { useMapTransform } from '@/lib/hooks/useMapTransform'

interface MapCanvasProps {
  mapName?: string
  tick?: DemoTickDto
  events?: DemoEventsResponseDto
  width?: number
  height?: number
}

const TEAM_COLORS: Record<string, string> = {
  CT: '#38bdf8',
  T: '#fbbf24',
}

const GRENADE_COLORS: Record<string, string> = {
  smoke: '#94a3b8',
  flash: '#fde68a',
  he: '#fb7185',
  molotov: '#fb923c',
  incendiary: '#fb923c',
}

export function MapCanvas({ mapName = 'de_dust2', tick, events, width = 720, height = 720 }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [radar, setRadar] = useState<HTMLImageElement | null>(null)
  const { worldToCanvas } = useMapTransform({ mapName, canvasSize: { width, height } })
  const currentKills = useMemo(
    () => events?.kills?.filter((kill) => Math.abs(kill.tick - (tick?.tick ?? 0)) <= 32) ?? [],
    [events?.kills, tick?.tick]
  )

  useEffect(() => {
    const image = new Image()
    image.src = `/maps/${mapName}_radar.png`
    image.onload = () => setRadar(image)
    image.onerror = () => setRadar(null)
  }, [mapName])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#09090b'
      ctx.fillRect(0, 0, width, height)

      if (radar) {
        ctx.drawImage(radar, 0, 0, width, height)
      } else {
        drawFallbackGrid(ctx, width, height)
      }

      drawGrenades(ctx, tick, worldToCanvas)
      drawPlayers(ctx, tick, worldToCanvas)
      drawKills(ctx, currentKills, worldToCanvas)
      drawAnnotation(ctx, tick, width)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [currentKills, height, radar, tick, width, worldToCanvas])

  return (
    <canvas
      ref={canvasRef}
      className="aspect-square w-full max-w-full rounded border border-zinc-800 bg-zinc-950"
      data-testid="demo-map-canvas"
      aria-label="Demo radar map"
    />
  )
}

function drawFallbackGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = '#27272a'
  ctx.lineWidth = 1
  for (let line = 0; line <= width; line += 64) {
    ctx.beginPath()
    ctx.moveTo(line, 0)
    ctx.lineTo(line, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, line)
    ctx.lineTo(width, line)
    ctx.stroke()
  }
}

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  tick: DemoTickDto | undefined,
  worldToCanvas: (x: number, y: number) => { x: number; y: number }
) {
  tick?.players.forEach((player) => {
    const pos = worldToCanvas(player.x, player.y)
    const alive = player.alive !== false
    const color = TEAM_COLORS[player.team ?? 'CT'] ?? '#e5e7eb'

    ctx.globalAlpha = alive ? 1 : 0.35
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, alive ? 7 : 5, 0, Math.PI * 2)
    ctx.fill()

    if (typeof player.yaw === 'number') {
      const radians = (player.yaw * Math.PI) / 180
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.lineTo(pos.x + Math.cos(radians) * 18, pos.y + Math.sin(radians) * 18)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    ctx.fillStyle = '#f4f4f5'
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(player.name ?? player.steam_id.slice(-4), pos.x + 10, pos.y + 4)
  })
}

function drawGrenades(
  ctx: CanvasRenderingContext2D,
  tick: DemoTickDto | undefined,
  worldToCanvas: (x: number, y: number) => { x: number; y: number }
) {
  tick?.grenades?.forEach((grenade) => {
    const pos = worldToCanvas(grenade.x, grenade.y)
    ctx.fillStyle = GRENADE_COLORS[grenade.type] ?? '#a3e635'
    ctx.beginPath()
    ctx.rect(pos.x - 4, pos.y - 4, 8, 8)
    ctx.fill()
  })
}

function drawKills(
  ctx: CanvasRenderingContext2D,
  kills: NonNullable<DemoEventsResponseDto['kills']>,
  worldToCanvas: (x: number, y: number) => { x: number; y: number }
) {
  kills.forEach((kill) => {
    const victimX = kill.victim.position?.x
    const victimY = kill.victim.position?.y
    if (victimX === null || victimY === null || victimX === undefined || victimY === undefined) return
    const victim = worldToCanvas(victimX, victimY)
    const attackerX = kill.attacker.position?.x
    const attackerY = kill.attacker.position?.y
    const suspicious = kill.review_signal.flag_reasons.length > 0
    ctx.strokeStyle = suspicious ? '#fecaca' : '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(victim.x - 8, victim.y - 8)
    ctx.lineTo(victim.x + 8, victim.y + 8)
    ctx.moveTo(victim.x + 8, victim.y - 8)
    ctx.lineTo(victim.x - 8, victim.y + 8)
    ctx.stroke()

    if (suspicious && attackerX !== null && attackerY !== null && attackerX !== undefined && attackerY !== undefined) {
      const attacker = worldToCanvas(attackerX, attackerY)
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = '#fca5a5'
      ctx.beginPath()
      ctx.arc(attacker.x, attacker.y, 15, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(attacker.x, attacker.y)
      ctx.lineTo(victim.x, victim.y)
      ctx.stroke()
      ctx.setLineDash([])

      const score = Math.round(kill.review_signal.suspicion_score * 100)
      const badgeX = Math.min(Math.max(attacker.x + 12, 4), 660)
      const badgeY = Math.min(Math.max(attacker.y - 22, 4), 690)
      ctx.fillStyle = 'rgba(127, 29, 29, 0.9)'
      ctx.fillRect(badgeX, badgeY, 34, 18)
      ctx.fillStyle = '#fee2e2'
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.fillText(String(score), badgeX + 7, badgeY + 13)
    }
  })
}

function drawAnnotation(ctx: CanvasRenderingContext2D, tick: DemoTickDto | undefined, width: number) {
  ctx.fillStyle = 'rgba(9, 9, 11, 0.75)'
  ctx.fillRect(12, 12, 150, 28)
  ctx.fillStyle = '#e4e4e7'
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(`tick ${tick?.tick ?? '-'}`, 22, 31)
  ctx.fillText('CS2 DEMO VIEW', width - 112, 31)
}
