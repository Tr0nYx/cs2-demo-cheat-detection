'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type {
  DemoOutcome,
  DemoStatus,
  DemoSummaryDto,
  FilterCriteria,
  FilteredDemosResponse,
  RatingBand,
} from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
const STORAGE_KEY = 'cs2cd_filter_history'
const MAX_HISTORY = 5

const DEFAULT_FILTERS: FilterCriteria = {
  map: null,
  ratingBand: null,
  outcome: null,
  daysBack: null,
  limit: 20,
  offset: 0,
}

class FilteredDemosError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message)
  }
}

interface ApiDemoSummary {
  id: string
  map: string | null
  status: DemoStatus
  uploaded_at: string
  trace_adjusted: number | null
  outcome?: DemoOutcome | null
}

interface ApiFilteredDemosResponse {
  demos: ApiDemoSummary[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

function safeReadHistory(): FilterCriteria[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is Partial<FilterCriteria> => item !== null && typeof item === 'object')
      .slice(0, MAX_HISTORY)
      .map((item) => ({ ...DEFAULT_FILTERS, ...item }))
  } catch {
    return []
  }
}

function safeWriteHistory(history: FilterCriteria[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch {
    // Storage quota or privacy mode should not block filtering.
  }
}

function normalizeResponse(payload: ApiFilteredDemosResponse): FilteredDemosResponse {
  return {
    demos: payload.demos.map((demo): DemoSummaryDto => ({
      id: demo.id,
      map: demo.map,
      status: demo.status,
      uploadedAt: demo.uploaded_at,
      traceAdjusted: demo.trace_adjusted,
      outcome: demo.outcome ?? null,
    })),
    total: payload.pagination.total,
    hasMore: payload.pagination.hasMore,
  }
}

function buildParams(filters: FilterCriteria): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.map) params.set('map', filters.map)
  if (filters.ratingBand) params.set('rating_band', filters.ratingBand)
  if (filters.outcome) params.set('outcome', filters.outcome)
  if (filters.daysBack) params.set('days_back', String(filters.daysBack))
  params.set('limit', String(filters.limit))
  params.set('offset', String(filters.offset))

  return params
}

export function useFilteredDemos(initialFilters: Partial<FilterCriteria> = {}) {
  const { data: session } = useSession()
  const [filterHistory, setFilterHistory] = useState<FilterCriteria[]>([])
  const [accumulatedDemos, setAccumulatedDemos] = useState<DemoSummaryDto[]>([])
  const [filters, setFilters] = useState<FilterCriteria>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  useEffect(() => {
    const history = safeReadHistory()
    setFilterHistory(history)

    if (history.length > 0 && Object.keys(initialFilters).length === 0) {
      setFilters(history[0])
    }
  }, [])

  const queryKey = useMemo(
    () => [
      'demos',
      'filtered',
      filters.map,
      filters.ratingBand,
      filters.outcome,
      filters.daysBack,
      filters.limit,
      filters.offset,
      session?.accessToken ?? null,
    ],
    [filters.map, filters.ratingBand, filters.outcome, filters.daysBack, filters.limit, filters.offset, session?.accessToken]
  )

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<FilteredDemosResponse> => {
      const params = buildParams(filters)
      const response = await fetch(`${API_BASE_URL}/demos?${params.toString()}`, {
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData?.error?.message || errorData?.message || 'Failed to fetch filtered demos'
        throw new FilteredDemosError(message, response.status >= 500)
      }

      return normalizeResponse(await response.json())
    },
    staleTime: 60000,
    gcTime: 300000,
    retry: (failureCount, error) => {
      if (error instanceof FilteredDemosError && !error.retryable) {
        return false
      }

      return failureCount < 2
    },
  })

  useEffect(() => {
    if (!query.data) {
      return
    }

    setAccumulatedDemos((current) => {
      if (filters.offset === 0) {
        return query.data.demos
      }

      const seen = new Set(current.map((demo) => demo.id))
      return [...current, ...query.data.demos.filter((demo) => !seen.has(demo.id))]
    })
  }, [query.data, filters.offset])

  const updateFilters = useCallback((newFilters: Partial<FilterCriteria>) => {
    setFilters((current) => {
      const merged: FilterCriteria = {
        ...current,
        ...newFilters,
        limit: newFilters.limit ?? current.limit ?? DEFAULT_FILTERS.limit,
        offset: newFilters.offset ?? (newFilters.map !== undefined || newFilters.ratingBand !== undefined || newFilters.outcome !== undefined || newFilters.daysBack !== undefined ? 0 : current.offset),
      }

      const nextHistory = [
        merged,
        ...filterHistory.filter((item) => JSON.stringify(item) !== JSON.stringify(merged)),
      ].slice(0, MAX_HISTORY)

      setFilterHistory(nextHistory)
      safeWriteHistory(nextHistory)

      return merged
    })
  }, [filterHistory])

  return {
    filters,
    updateFilters,
    demos: accumulatedDemos,
    total: query.data?.total ?? 0,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading || query.isFetching,
    error: query.error?.message ?? null,
    filterHistory,
    queryKey,
  }
}

export type { FilterCriteria, RatingBand, DemoOutcome }
