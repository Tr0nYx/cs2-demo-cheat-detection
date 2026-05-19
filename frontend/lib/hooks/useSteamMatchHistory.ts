'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// Default to host nginx proxy on port 8080 so browser requests reach the backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export interface SteamMatchHistoryStatus {
  connected: boolean
  status: 'active' | 'caught_up' | 'invalid_seed' | 'auth_failed' | 'rate_limited' | 'steam_unavailable' | 'disconnected'
  connected_since: string | null
  last_check_at: string | null
  next_check_at: string | null
  known_sharecode: string | null
  discovered_count: number
  queued_count: number
  imported_count: number
  last_error: { code: string; message: string | null } | null
}

export interface ConnectSteamMatchHistoryInput {
  steamidkey: string
  seed: string
}

const queryKey = ['steam-match-history']

async function requestJson<T>(url: string, accessToken?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with ${response.status}`)
  }

  return response.json()
}

export function useSteamMatchHistory() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const status = useQuery<SteamMatchHistoryStatus>({
    queryKey: [...queryKey, session?.accessToken ?? null],
    queryFn: () => requestJson<SteamMatchHistoryStatus>(`${API_BASE_URL}/steam/match-history`, session?.accessToken),
    enabled: Boolean(session?.accessToken),
  })

  const connect = useMutation<SteamMatchHistoryStatus, Error, ConnectSteamMatchHistoryInput>({
    mutationFn: (input) =>
      requestJson<SteamMatchHistoryStatus>(
        `${API_BASE_URL}/steam/match-history/connect`,
        session?.accessToken,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  const disconnect = useMutation<SteamMatchHistoryStatus, Error, void>({
    mutationFn: () =>
      requestJson<SteamMatchHistoryStatus>(
        `${API_BASE_URL}/steam/match-history`,
        session?.accessToken,
        {
          method: 'DELETE',
        }
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    ...status,
    connect,
    disconnect,
  }
}
