'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { DemoHistorySection } from '@/components/PlayerProfile/DemoHistorySection'
import { ProfileNav } from '@/components/PlayerProfile/ProfileNav'
import { ResearchDisclaimerBanner } from '@/components/ResearchDisclaimerBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePlayerProfile } from '@/lib/hooks/usePlayerProfile'

export default function PlayerDemosPage() {
  const params = useParams<{ playerId: string }>()
  const playerId = params.playerId
  const [offset, setOffset] = useState(0)
  const limit = 20
  const { data, isLoading } = usePlayerProfile(playerId, limit, offset)
  const playerName = data?.history?.results[0]?.player.display_name || data?.history?.steam_profile?.persona_name || playerId
  const hasMore = (data?.history?.results.length ?? 0) === limit

  return (
    <main className="min-h-screen bg-white px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ResearchDisclaimerBanner />
        <ProfileNav playerId={playerId} playerName={playerName} active="demos" />
        <header>
          <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Player demo history</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Full paginated record of analyzed demos for this player, ordered newest first.
          </p>
        </header>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading demos
            </CardContent>
          </Card>
        )}

        <DemoHistorySection playerId={playerId} history={data?.history ?? null} compact={false} />

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={offset === 0 || isLoading} onClick={() => setOffset(Math.max(0, offset - limit))}>
            Previous
          </Button>
          <Button variant="outline" disabled={!hasMore || isLoading} onClick={() => setOffset(offset + limit)}>
            Next
          </Button>
        </div>
      </div>
    </main>
  )
}
