'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { PlayerComparisonCard } from '@/components/Comparison/PlayerComparisonCard'
import { usePlayerComparison } from '@/lib/hooks/usePlayerComparison'

/**
 * Player Comparison Page - Side-by-side player comparison view.
 *
 * Route: /players/[playerId]/compare?with=[otherPlayerId]
 *
 * Displays comprehensive comparison between two players across 4 metrics:
 * - Component breakdown with percentile rankings
 * - TRACE trend history (last 10 demos)
 * - Map affinity (top 3 maps)
 * - Shared demo history
 *
 * Parameters:
 * - playerId: string (from route) - First player to compare
 * - with: string (query param) - Second player to compare against
 */
function PlayerComparisonPageContent({ playerId }: { playerId: string }) {
  const searchParams = useSearchParams()
  const compareWithId = searchParams.get('with')
  const { data, isLoading, error } = usePlayerComparison(playerId, compareWithId)

  // Redirect if missing compareWithId
  if (!compareWithId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Select Player to Compare
            </h1>
            <p className="text-gray-600 mb-6">
              Use the leaderboards to select a player to compare against {playerId}
            </p>
            <Link
              href="/leaderboards/global"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Global Leaderboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation and title */}
        <div className="mb-8">
          <Link
            href="/leaderboards/global"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Leaderboards
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">Player Comparison</h1>
          <p className="text-gray-600 mt-2">
            Compare stats and performance across 4 key metrics
          </p>
        </div>

        {/* Comparison card */}
        <PlayerComparisonCard data={data} isLoading={isLoading} error={error} />

        {/* Footer with data info */}
        {data && !isLoading && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Comparison data is cached for 5 minutes</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlayerComparisonPage() {
  const params = useParams<{ playerId: string }>()

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8">
              <div className="h-12 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <PlayerComparisonPageContent playerId={params.playerId} />
    </Suspense>
  )
}
