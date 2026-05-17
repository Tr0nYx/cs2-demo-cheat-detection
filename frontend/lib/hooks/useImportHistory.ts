'use client'

import { useQuery } from '@tanstack/react-query'

export interface ImportHistoryItem {
  id: string
  sharecode: string
  platform: string
  status: 'pending' | 'downloading' | 'parsing' | 'complete' | 'failed'
  imported_at: string
  completed_at?: string
  demo_id?: string
  error_message?: string
}

export interface ImportHistoryResponse {
  imports: ImportHistoryItem[]
  total: number
}

export function useImportHistory(limit: number = 50) {
  return useQuery<ImportHistoryResponse>({
    queryKey: ['importHistory', limit],
    queryFn: async () => {
      const response = await fetch(`/api/demos/import-history?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch import history')
      return response.json()
    },
    refetchInterval: 2000, // Poll every 2 seconds (D-20 real-time)
    refetchIntervalInBackground: true,
  })
}
