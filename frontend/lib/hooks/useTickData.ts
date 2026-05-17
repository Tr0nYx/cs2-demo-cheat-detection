'use client'

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { DemoTicksParams, fetchDemoTicks } from '@/lib/api'
import type { DemoTicksResponseDto } from '@/lib/types'

const CHUNK_SIZE = 500
const DEFAULT_STEP = 4

export interface UseTickDataOptions extends DemoTicksParams {
  prefetch?: boolean
}

export type UseTickDataResult = UseQueryResult<DemoTicksResponseDto, Error> & {
  isGenerating: boolean
  chunkFromTick?: number
  chunkToTick?: number
}

export function tickChunkRange(options: UseTickDataOptions): { fromTick?: number; toTick?: number } {
  if (options.round !== undefined && options.fromTick === undefined && options.toTick === undefined) {
    return { fromTick: undefined, toTick: undefined }
  }

  if (options.fromTick === undefined) {
    return { fromTick: undefined, toTick: options.toTick }
  }

  const fromTick = Math.floor(options.fromTick / CHUNK_SIZE) * CHUNK_SIZE
  const requestedTo = options.toTick ?? fromTick + CHUNK_SIZE
  const toTick = Math.min(fromTick + CHUNK_SIZE, requestedTo)

  return { fromTick, toTick }
}

export function tickQueryKey(demoId: string | null | undefined, options: UseTickDataOptions) {
  const range = tickChunkRange(options)
  return [
    'demo-ticks',
    demoId,
    range.fromTick ?? null,
    range.toTick ?? null,
    options.round ?? null,
    options.step ?? DEFAULT_STEP,
    options.players?.join(',') ?? '',
  ] as const
}

export function useTickData(
  demoId: string | null | undefined,
  options: UseTickDataOptions = {}
): UseTickDataResult {
  const queryClient = useQueryClient()
  const range = useMemo(() => tickChunkRange(options), [options.fromTick, options.toTick, options.round])
  const params = useMemo(
    () => ({
      ...options,
      fromTick: range.fromTick,
      toTick: range.toTick,
      step: options.step ?? DEFAULT_STEP,
    }),
    [options, range.fromTick, range.toTick]
  )

  const query = useQuery({
    queryKey: tickQueryKey(demoId, params),
    queryFn: () => fetchDemoTicks(demoId as string, params),
    enabled: Boolean(demoId) && (params.round !== undefined || (params.fromTick !== undefined && params.toTick !== undefined)),
    staleTime: 15000,
    retry: (failureCount, error: any) => error?.response?.status !== 202 && failureCount < 1,
  })

  useEffect(() => {
    if (!demoId || options.prefetch === false || params.fromTick === undefined || params.toTick === undefined) {
      return
    }

    const nextFrom = params.toTick + 1
    const nextTo = nextFrom + CHUNK_SIZE
    const nextParams = { ...params, fromTick: nextFrom, toTick: nextTo }

    queryClient.prefetchQuery({
      queryKey: tickQueryKey(demoId, nextParams),
      queryFn: () => fetchDemoTicks(demoId, nextParams),
      staleTime: 15000,
    })
  }, [demoId, options.prefetch, params, queryClient])

  return {
    ...query,
    isGenerating: query.data?.status === 'generating',
    chunkFromTick: params.fromTick,
    chunkToTick: params.toTick,
  }
}
