'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { fetchDemoRounds } from '@/lib/api'
import type { DemoRoundsResponseDto } from '@/lib/types'

export function useDemoRounds(
  demoId: string | null | undefined
): UseQueryResult<DemoRoundsResponseDto, Error> {
  return useQuery({
    queryKey: ['demo-rounds', demoId],
    queryFn: () => fetchDemoRounds(demoId as string),
    enabled: Boolean(demoId),
    staleTime: 300000,
  })
}
