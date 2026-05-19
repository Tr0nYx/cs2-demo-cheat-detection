'use client'

import Link from 'next/link'
import { Crosshair, MapPinned } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStatsContextLabel } from '@/lib/research-context'
import type { PlayerStatsResponse } from '@/lib/hooks/usePlayerProfile'

function formatPercent(value: number | null) {
  if (value === null) return 'n/a'
  return `${Math.round(value * 100)}%`
}

export function StatsSection({
  playerId,
  stats,
  detailed = false,
}: {
  playerId: string
  stats: PlayerStatsResponse | null
  detailed?: boolean
}) {
  const maps = detailed ? stats?.maps ?? [] : (stats?.maps ?? []).slice(0, 3)
  const weapons = detailed ? stats?.weapons ?? [] : (stats?.weapons ?? []).slice(0, 4)
  const insufficient = stats?.metadata.insufficientData

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Map and weapon stats</CardTitle>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{getStatsContextLabel()}</p>
        </div>
        {!detailed && (
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`/players/${playerId}/stats`}>
            View stats
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {!stats ? (
          <p className="text-sm text-gray-500">Statistics are not available right now.</p>
        ) : insufficient ? (
          <p className="text-sm text-gray-500">Insufficient data in the last 30 days.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <MapPinned className="h-4 w-4" aria-hidden="true" />
                Map affinity
              </h3>
              <div className="space-y-2">
                {maps.length === 0 ? (
                  <p className="text-sm text-gray-500">No map data available.</p>
                ) : maps.map((map) => (
                  <div key={map.map} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{map.map}</span>
                      <span className="text-sm text-gray-500">{map.demoCount} demos</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Win rate {formatPercent(map.winRate)} | Avg TRACE {map.averageTraceScore?.toFixed(2) ?? 'n/a'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Crosshair className="h-4 w-4" aria-hidden="true" />
                Weapon activity
              </h3>
              <div className="space-y-2">
                {weapons.length === 0 ? (
                  <p className="text-sm text-gray-500">No weapon telemetry available.</p>
                ) : weapons.map((weapon) => (
                  <div key={weapon.weapon} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium uppercase">{weapon.weapon}</span>
                      <span className="text-xs uppercase text-gray-500">{weapon.category}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {weapon.usageCount} uses | {weapon.killCount} kills | Kill rate {formatPercent(weapon.killRate)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
