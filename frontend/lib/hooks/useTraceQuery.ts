'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { TraceDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

/**
 * React Query hook for fetching TRACE rating data from the API.
 * Handles 404 gracefully (returns null instead of error).
 * Caches for 1 hour since TRACE is immutable once calculated.
 *
 * @param demoId - Demo ID to fetch TRACE data for
 * @returns React Query result with TraceDto | null
 */
export function useTraceQuery(demoId: string): UseQueryResult<TraceDto | null, Error> {
  return useQuery({
    queryKey: ['trace', demoId],
    queryFn: async (): Promise<TraceDto | null> => {
      const response = await fetch(`${API_BASE_URL}/demos/${demoId}/trace`)

      // Handle 404: TRACE doesn't exist yet or won't be calculated for this demo
      // Return null instead of throwing error
      if (response.status === 404) {
        return null
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Failed to fetch TRACE: ${response.statusText}`
        )
      }

      return response.json() as Promise<TraceDto>
    },
    retry: 1, // Retry once on network errors
    staleTime: 3600000, // 1 hour: TRACE is immutable once calculated
  })
}
