'use client'

import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { ProfileNav } from '@/components/PlayerProfile/ProfileNav'
import { StatsSection } from '@/components/PlayerProfile/StatsSection'
import { TraceSection } from '@/components/PlayerProfile/TraceSection'
import { ResearchDisclaimerBanner } from '@/components/ResearchDisclaimerBanner'
import { Card, CardContent } from '@/components/ui/card'
import { usePlayerProfile } from '@/lib/hooks/usePlayerProfile'

export default function PlayerStatsPage() {
  const params = useParams<{ playerId: string }>()
  const playerId = params.playerId
  const { data, isLoading } = usePlayerProfile(playerId, 10, 0)
  const playerName = data?.history?.results[0]?.player.display_name || data?.history?.steam_profile?.persona_name || playerId

  return (
    <main className="min-h-screen bg-white px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ResearchDisclaimerBanner />
        <ProfileNav playerId={playerId} playerName={playerName} active="stats" />
        <header>
          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Player statistics</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Detailed recent map, weapon, and TRACE activity. Statistics are computed on demand from analyzed demos.
          </p>
        </header>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading statistics
            </CardContent>
          </Card>
        )}

        <StatsSection playerId={playerId} stats={data?.stats ?? null} detailed />
        <TraceSection traceHistory={data?.traceHistory ?? null} />
      </div>
    </main>
  )
}
