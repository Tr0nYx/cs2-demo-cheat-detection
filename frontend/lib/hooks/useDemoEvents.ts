'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { DemoEventsParams, fetchDemoEvents } from '@/lib/api'
import type { DemoEventsResponseDto } from '@/lib/types'

export function useDemoEvents(
  demoId: string | null | undefined,
  params: DemoEventsParams = {}
): UseQueryResult<DemoEventsResponseDto, Error> {
  return useQuery({
    queryKey: ['demo-events', demoId, params.type ?? 'all', params.round ?? null, params.player ?? null],
    queryFn: () => fetchDemoEvents(demoId as string, params),
    enabled: Boolean(demoId),
    staleTime: 60000,
  })
}
