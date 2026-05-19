'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { TraceHistoryCollectionDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

/**
 * React Query hook for fetching TRACE history with percentile rankings.
 * Retrieves the last N TRACE records for a player with component percentiles.
 *
 * @param playerId - Player ID to fetch TRACE history for (optional - skips fetch if not provided)
 * @param limit - Number of records to retrieve (1-100, default 10)
 * @returns React Query result with TraceHistoryCollectionDto
 */
export function useTraceHistoryQuery(
  playerId: string | undefined,
  limit: number = 10
): UseQueryResult<TraceHistoryCollectionDto, Error> {
  return useQuery({
    queryKey: playerId ? ['traceHistory', playerId, limit] : ['traceHistory', null],
    queryFn: async (): Promise<TraceHistoryCollectionDto> => {
      if (!playerId) {
        throw new Error('Player ID is required');
      }

      const response = await fetch(
        `${API_BASE_URL}/players/${playerId}/trace-history?limit=${limit}&sortBy=date`
      )

      if (!response.ok) {
        let errorMessage = `Failed to fetch TRACE history: ${response.statusText}`;

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // JSON parse failed, use statusText fallback
          }
        }

        throw new Error(errorMessage);
      }

      return response.json() as Promise<TraceHistoryCollectionDto>
    },
    staleTime: 600000, // 10 minutes: history changes with new demos
    retry: 1,
    enabled: !!playerId, // Don't fetch until playerId is available
  })
}
