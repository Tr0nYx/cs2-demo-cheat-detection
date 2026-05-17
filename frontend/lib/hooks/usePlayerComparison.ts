'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'

/**
 * Component breakdown data for a single player in comparison.
 */
export interface ComponentBreakdownData {
  components: Record<string, { value: number; percentile: number }>
  traceDatetime: string
}

/**
 * TRACE trend data for a single player in comparison.
 */
export interface TrendData {
  history: Array<{ date: string; value: number }>
  trending: boolean
}

/**
 * Map affinity data for a single player in comparison.
 */
export interface MapAffinityData {
  topMaps: Array<{ map: string; traceAdjusted: number }>
}

/**
 * Match history data for a single player in comparison.
 */
export interface MatchHistoryData {
  sharedDemos: Array<{ demoId: string; date: string; mapId?: string }>
}

/**
 * Full player comparison data aggregating all 4 metrics.
 */
export interface PlayerComparisonData {
  playerAId: string
  playerAName: string
  playerAComponents: ComponentBreakdownData
  playerATrend: TrendData
  playerAMaps: MapAffinityData
  playerAHistory: MatchHistoryData
  playerBId: string
  playerBName: string
  playerBComponents: ComponentBreakdownData
  playerBTrend: TrendData
  playerBMaps: MapAffinityData
  playerBHistory: MatchHistoryData
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

/**
 * React Query hook for fetching player comparison data.
 *
 * Fetches comprehensive comparison between two players across 4 metrics:
 * - Component breakdown with percentile rankings
 * - TRACE trend history (last 10 demos)
 * - Map affinity (top 3 maps by score)
 * - Shared demo history
 *
 * @param playerId - ID of first player
 * @param compareWithId - ID of second player to compare against (optional - skips fetch if not provided)
 * @returns React Query result with PlayerComparisonData
 */
export function usePlayerComparison(
  playerId: string,
  compareWithId: string | null
): UseQueryResult<PlayerComparisonData | null, Error> {
  return useQuery({
    queryKey: ['playerComparison', playerId, compareWithId],
    queryFn: async (): Promise<PlayerComparisonData | null> => {
      if (!compareWithId) {
        return null
      }

      const response = await fetch(
        `${API_BASE_URL}/players/${playerId}/compare?with=${compareWithId}`
      )

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Failed to fetch player comparison: ${response.statusText}`
        )
      }

      return response.json() as Promise<PlayerComparisonData>
    },
    enabled: !!compareWithId, // Only run query if compareWithId is provided
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes (leaderboards change as demos complete)
  })
}
