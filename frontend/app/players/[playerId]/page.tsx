'use client'

import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { DemoHistorySection } from '@/components/PlayerProfile/DemoHistorySection'
import { ProfileNav } from '@/components/PlayerProfile/ProfileNav'
import { StatsSection } from '@/components/PlayerProfile/StatsSection'
import { SteamProfileSection } from '@/components/PlayerProfile/SteamProfileSection'
import { TraceSection } from '@/components/PlayerProfile/TraceSection'
import { ResearchDisclaimerBanner } from '@/components/ResearchDisclaimerBanner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePlayerProfile } from '@/lib/hooks/usePlayerProfile'

export default function PlayerProfilePage() {
  const params = useParams<{ playerId: string }>()
  const playerId = params.playerId
  const { data, isLoading, error, refetch } = usePlayerProfile(playerId)
  const playerName = data?.history?.results[0]?.player.display_name || data?.history?.steam_profile?.persona_name || playerId

  return (
    <main className="min-h-screen bg-white px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ResearchDisclaimerBanner />
        <ProfileNav playerId={playerId} playerName={playerName} active="overview" />

        <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {data?.history?.steam_profile?.profile_url ? (
              <a
                href={data.history.steam_profile.profile_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block font-mono text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {playerId}
              </a>
            ) : (
              <p className="font-mono text-xs text-gray-500">{playerId}</p>
            )}
            <h1 className="mt-1 text-3xl font-semibold text-gray-950 dark:text-white">{playerName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
              Player-level profile for reviewing post-game demos, TRACE patterns, recent map and weapon activity, and optional Steam profile context.
            </p>
          </div>
          <Link className={buttonVariants({ variant: 'outline' })} href={`/players/${playerId}/compare`}>
            Compare with another player
          </Link>
        </header>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading player profile
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error.message}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data && Object.values(data.errors).some(Boolean) && (
          <Alert>
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Some profile sections could not load. Available sections remain visible with partial data.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <TraceSection traceHistory={data?.traceHistory ?? null} />
          <DemoHistorySection playerId={playerId} history={data?.history ?? null} />
          <StatsSection playerId={playerId} stats={data?.stats ?? null} />
          <SteamProfileSection profile={data?.history?.steam_profile ?? null} />
        </div>
      </div>
    </main>
  )
}
