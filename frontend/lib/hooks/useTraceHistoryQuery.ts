'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { TraceHistoryCollectionDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

/**
 * React Query hook for fetching TRACE history with percentile rankings.
 * Retrieves the last N TRACE records for a player with component percentiles.
 *
 * @param playerId - Player ID to fetch TRACE history for
 * @param limit - Number of records to retrieve (1-100, default 10)
 * @returns React Query result with TraceHistoryCollectionDto
 */
export function useTraceHistoryQuery(
  playerId: string,
  limit: number = 10
): UseQueryResult<TraceHistoryCollectionDto, Error> {
  return useQuery({
    queryKey: ['traceHistory', playerId, limit],
    queryFn: async (): Promise<TraceHistoryCollectionDto> => {
      const response = await fetch(
        `${API_BASE_URL}/players/${playerId}/trace-history?limit=${limit}&sortBy=date`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Failed to fetch TRACE history: ${response.statusText}`
        )
      }

      return response.json() as Promise<TraceHistoryCollectionDto>
    },
    staleTime: 600000, // 10 minutes: history changes with new demos
    retry: 1,
    enabled: !!playerId, // Don't fetch until playerId is available
  })
}
