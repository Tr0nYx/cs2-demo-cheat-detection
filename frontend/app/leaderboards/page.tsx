'use client'

import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { LeaderboardFilters } from '@/components/Leaderboard/LeaderboardFilters'
import { useFilteredLeaderboard } from '@/lib/hooks/useFilteredLeaderboard'

function formatScore(score: number) {
  return score.toFixed(2)
}

export default function LeaderboardsPage() {
  const {
    filters,
    updateFilters,
    players,
    total,
    hasMore,
    isLoading,
    error,
  } = useFilteredLeaderboard()

  return (
    <main className="min-h-screen bg-white px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">TRACE Leaderboards</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Research rankings from post-game demos. Scores are signals for review, not proof of cheating.
            </p>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {total} qualified players
          </div>
        </header>

        <LeaderboardFilters
          filters={filters}
          onFilterChange={updateFilters}
          isLoading={isLoading}
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-950 dark:text-white">Filtered Rankings</h2>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating
              </div>
            )}
          </div>

          {isLoading && players.length === 0 ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-md bg-gray-100 dark:bg-gray-900" />
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-medium text-gray-900 dark:text-gray-100">No qualified players match this scope.</p>
              <p className="mt-1 text-sm text-gray-500">Try widening the map, rating band, or timeframe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Rank</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Player</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">95th TRACE</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Demos</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Components</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                  {players.map((player) => (
                    <tr key={player.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-900/70">
                      <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">#{player.rank}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/players/${player.playerId}`}
                          className="font-medium text-gray-950 underline-offset-4 hover:underline dark:text-white"
                        >
                          {player.username}
                        </Link>
                        <div className="mt-1 font-mono text-xs text-gray-500">{player.playerId}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatScore(player.percentile95)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{player.demoCount}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        eKILL {formatScore(player.components.ekill)} | AIM {formatScore(player.components.aim)} | KAST {formatScore(player.components.kast)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {hasMore && (
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => updateFilters({ offset: filters.offset + filters.limit })}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
