'use client'

import { useQueries, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { AnalyticsTrendResponse, ArcTrendDto, ConsistencyTrendDto, TrendMetric, WeaponStrengthDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

async function fetchTrend(metric: TrendMetric, accessToken?: string): Promise<AnalyticsTrendResponse> {
  const response = await fetch(`${API_BASE_URL}/analytics/trends/${metric}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData?.error?.message || `Failed to load ${metric} trend`)
  }

  return response.json()
}

export function useAnalyticsTrends(metric: TrendMetric) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['analytics', 'trends', metric, session?.accessToken ?? null],
    queryFn: () => fetchTrend(metric, session?.accessToken),
    staleTime: 600000,
    gcTime: 1800000,
  })
}

export function useAllTrends() {
  const { data: session } = useSession()
  const results = useQueries({
    queries: (['consistency', 'arc', 'weapons'] as TrendMetric[]).map((metric) => ({
      queryKey: ['analytics', 'trends', metric, session?.accessToken ?? null],
      queryFn: () => fetchTrend(metric, session?.accessToken),
      staleTime: 600000,
      gcTime: 1800000,
    })),
  })

  return {
    consistency: results[0] as typeof results[0] & { data?: ConsistencyTrendDto },
    arc: results[1] as typeof results[1] & { data?: ArcTrendDto },
    weapons: results[2] as typeof results[2] & { data?: WeaponStrengthDto },
  }
}
