'use client'

import { useQuery } from '@tanstack/react-query'
import type { SteamPlayerProfileData } from '@/lib/hooks/usePlayerComparison'
import type { TraceHistoryCollectionDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export interface PlayerHistoryResult {
  result_id: string
  demo_id: string
  player: {
    steam_id: string
    display_name: string | null
  }
  scores: {
    aimbot: number
    wallhack: number
    triggerbot: number
    recoil: number
    bhop: number
    session_consistency: number
    overall: number
  }
  label: string
  analyzed_at: string
  demo?: {
    map?: string | null
    outcome?: 'win' | 'loss' | 'draw' | null
    uploaded_at?: string
    processed_at?: string | null
  }
}

export interface PlayerHistoryResponse {
  steam_id: string
  steam_profile?: SteamPlayerProfileData | null
  limit: number
  offset: number
  results: PlayerHistoryResult[]
}

export interface PlayerStatsResponse {
  maps: Array<{
    map: string
    demoCount: number
    winRate: number | null
    averageTraceScore: number | null
  }>
  weapons: Array<{
    weapon: string
    category: string
    usageCount: number
    killCount: number
    killRate: number | null
  }>
  metadata: {
    dataWindow: string
    computedAt: string
    demoCount: number
    insufficientData: boolean
  }
}

export interface PlayerProfileData {
  traceHistory: TraceHistoryCollectionDto | null
  history: PlayerHistoryResponse | null
  stats: PlayerStatsResponse | null
  errors: Partial<Record<'traceHistory' | 'history' | 'stats', string>>
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (response.status === 404) {
    throw new Error('Player data was not found.')
  }

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function usePlayerProfile(playerId: string, historyLimit = 10, historyOffset = 0) {
  return useQuery({
    queryKey: ['playerProfile', playerId, historyLimit, historyOffset],
    queryFn: async (): Promise<PlayerProfileData> => {
      const [traceHistory, history, stats] = await Promise.allSettled([
        fetchJson<TraceHistoryCollectionDto>(`/players/${playerId}/trace-history?limit=20`),
        fetchJson<PlayerHistoryResponse>(`/players/${playerId}/history?limit=${historyLimit}&offset=${historyOffset}`),
        fetchJson<PlayerStatsResponse>(`/players/${playerId}/stats?window=30d`),
      ])

      return {
        traceHistory: traceHistory.status === 'fulfilled' ? traceHistory.value : null,
        history: history.status === 'fulfilled' ? history.value : null,
        stats: stats.status === 'fulfilled' ? stats.value : null,
        errors: {
          traceHistory: traceHistory.status === 'rejected' ? traceHistory.reason.message : undefined,
          history: history.status === 'rejected' ? history.reason.message : undefined,
          stats: stats.status === 'rejected' ? stats.reason.message : undefined,
        },
      }
    },
    enabled: playerId.length > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}
