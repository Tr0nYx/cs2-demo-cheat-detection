'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  FilteredLeaderboardResponse,
  LeaderboardFilterCriteria,
  PlayerLeaderboardEntryDto,
} from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

const DEFAULT_FILTERS: LeaderboardFilterCriteria = {
  map: null,
  ratingBand: null,
  daysBack: null,
  limit: 25,
  offset: 0,
}

interface ApiPlayerLeaderboardEntry {
  rank: number
  playerId: string
  username: string
  avatar: string | null
  percentile95: number
  demoCount: number
  components: PlayerLeaderboardEntryDto['components']
  lastAnalyzedAt: string
}

interface ApiFilteredLeaderboardResponse {
  players: ApiPlayerLeaderboardEntry[]
  total: number
  hasMore: boolean
}

class FilteredLeaderboardError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message)
  }
}

function buildParams(filters: LeaderboardFilterCriteria): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.map) params.set('map', filters.map)
  if (filters.ratingBand) params.set('rating_band', filters.ratingBand)
  if (filters.daysBack) params.set('days_back', String(filters.daysBack))
  params.set('limit', String(filters.limit))
  params.set('offset', String(filters.offset))

  return params
}

function normalizeResponse(payload: ApiFilteredLeaderboardResponse): FilteredLeaderboardResponse {
  return {
    players: payload.players.map((player) => ({
      rank: player.rank,
      playerId: player.playerId,
      username: player.username,
      avatar: player.avatar ?? null,
      percentile95: player.percentile95,
      demoCount: player.demoCount,
      components: player.components,
      lastAnalyzedAt: player.lastAnalyzedAt,
    })),
    total: payload.total,
    hasMore: payload.hasMore,
  }
}

export function useFilteredLeaderboard(initialFilters: Partial<LeaderboardFilterCriteria> = {}) {
  const [filters, setFilters] = useState<LeaderboardFilterCriteria>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  const queryKey = useMemo(
    () => [
      'leaderboard',
      'filtered',
      filters.map,
      filters.ratingBand,
      filters.daysBack,
      filters.limit,
      filters.offset,
    ],
    [filters.map, filters.ratingBand, filters.daysBack, filters.limit, filters.offset]
  )

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<FilteredLeaderboardResponse> => {
      const params = buildParams(filters)
      const response = await fetch(`${API_BASE_URL}/leaderboards/filtered?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData?.error?.message || errorData?.message || 'Failed to fetch leaderboard'
        throw new FilteredLeaderboardError(message, response.status >= 500)
      }

      return normalizeResponse(await response.json())
    },
    staleTime: 60000,
    gcTime: 300000,
    retry: (failureCount, error) => {
      if (error instanceof FilteredLeaderboardError && !error.retryable) {
        return false
      }

      return failureCount < 2
    },
  })

  const updateFilters = useCallback((newFilters: Partial<LeaderboardFilterCriteria>) => {
    setFilters((current) => ({
      ...current,
      ...newFilters,
      limit: newFilters.limit ?? current.limit,
      offset: newFilters.offset ?? (newFilters.map !== undefined || newFilters.ratingBand !== undefined || newFilters.daysBack !== undefined ? 0 : current.offset),
    }))
  }, [])

  return {
    filters,
    updateFilters,
    players: query.data?.players ?? [],
    total: query.data?.total ?? 0,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading || query.isFetching,
    error: query.error?.message ?? null,
    queryKey,
  }
}

export type { LeaderboardFilterCriteria }
