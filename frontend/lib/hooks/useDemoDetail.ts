'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { DemoDetailDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

export function useDemoDetail(demoId: string) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['demo', demoId, 'detail', session?.accessToken ?? null],
    queryFn: async (): Promise<DemoDetailDto> => {
      const response = await fetch(`${API_BASE_URL}/demos/${demoId}/detail`, {
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || 'Failed to load demo detail')
      }

      return response.json()
    },
    staleTime: Infinity,
    gcTime: 600000,
    enabled: Boolean(demoId),
  })
}
