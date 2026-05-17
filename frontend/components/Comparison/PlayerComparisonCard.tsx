'use client'

import { ComponentBreakdownCard } from './ComponentBreakdownCard'
import { MapAffinityCard } from './MapAffinityCard'
import { MatchHistoryCard } from './MatchHistoryCard'
import { TrendCard } from './TrendCard'
import type { PlayerComparisonData } from '@/lib/hooks/usePlayerComparison'

/**
 * PlayerComparisonCard - Container component for 4-metric player comparison.
 *
 * Displays two players side-by-side with 4 comparison metrics each:
 * - Component breakdown (5 TRACE components with percentiles)
 * - TRACE trend (last 10 demos with sparkline)
 * - Map affinity (top 3 maps by score)
 * - Match history (shared demos)
 *
 * Props:
 * - data: PlayerComparisonData (optional) - Comparison data from API
 * - isLoading: boolean - Loading state from React Query
 * - error: Error | null - Error state from React Query
 */
interface PlayerComparisonCardProps {
  data?: PlayerComparisonData | null
  isLoading: boolean
  error: Error | null
}

export function PlayerComparisonCard({
  data,
  isLoading,
  error,
}: PlayerComparisonCardProps) {
  // Loading state: show skeleton for 4 metric cards
  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-4">
              {/* Skeleton for player column */}
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state: show error message
  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Comparison Error</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    )
  }

  // Empty state: no data
  if (!data) {
    return (
      <div className="w-full p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">No comparison data available</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with player names */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{data.playerAName}</h2>
          <p className="text-sm text-gray-500 mt-1">ID: {data.playerAId}</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{data.playerBName}</h2>
          <p className="text-sm text-gray-500 mt-1">ID: {data.playerBId}</p>
        </div>
      </div>

      {/* 4 Metric Cards in 2x2 Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Component Breakdown Cards */}
        <ComponentBreakdownCard
          playerName={data.playerAName}
          components={data.playerAComponents.components}
          traceDatetime={data.playerAComponents.traceDatetime}
        />
        <ComponentBreakdownCard
          playerName={data.playerBName}
          components={data.playerBComponents.components}
          traceDatetime={data.playerBComponents.traceDatetime}
        />

        {/* TRACE Trend Cards */}
        <TrendCard
          playerName={data.playerAName}
          history={data.playerATrend.history}
          trending={data.playerATrend.trending}
        />
        <TrendCard
          playerName={data.playerBName}
          history={data.playerBTrend.history}
          trending={data.playerBTrend.trending}
        />

        {/* Map Affinity Cards */}
        <MapAffinityCard
          playerName={data.playerAName}
          topMaps={data.playerAMaps.topMaps}
        />
        <MapAffinityCard
          playerName={data.playerBName}
          topMaps={data.playerBMaps.topMaps}
        />

        {/* Match History Cards */}
        <MatchHistoryCard
          playerName={data.playerAName}
          sharedDemos={data.playerAHistory.sharedDemos}
        />
        <MatchHistoryCard
          playerName={data.playerBName}
          sharedDemos={data.playerBHistory.sharedDemos}
        />
      </div>
    </div>
  )
}
