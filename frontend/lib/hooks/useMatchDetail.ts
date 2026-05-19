'use client'

import { useMemo } from 'react'

import { buildMatchDetailViewModel } from '@/lib/match-detail'
import { useDemoDetail } from '@/lib/hooks/useDemoDetail'
import { useDemoEvents } from '@/lib/hooks/useDemoEvents'
import { useDemoFetch } from '@/lib/hooks/useDemoFetch'
import { useDemoRounds } from '@/lib/hooks/useDemoRounds'

export function useMatchDetail(demoId: string) {
  const statusQuery = useDemoFetch(demoId)
  const detailQuery = useDemoDetail(demoId)
  const roundsQuery = useDemoRounds(demoId)
  const eventsQuery = useDemoEvents(demoId, { type: 'all' })

  const data = useMemo(() => {
    if (!detailQuery.data && !statusQuery.demo) return null

    return buildMatchDetailViewModel({
      demoDetail: detailQuery.data,
      demoStatus: statusQuery.demo,
      rounds: roundsQuery.data?.rounds ?? [],
      events: eventsQuery.data ?? {},
    })
  }, [detailQuery.data, eventsQuery.data, roundsQuery.data?.rounds, statusQuery.demo])

  const errors = {
    demo: statusQuery.error ?? null,
    detail: detailQuery.error ?? null,
    rounds: roundsQuery.error ?? null,
    events: eventsQuery.error ?? null,
  }

  return {
    data,
    demo: statusQuery.demo ?? detailQuery.data ?? null,
    rounds: roundsQuery.data?.rounds ?? [],
    events: eventsQuery.data ?? {},
    isLoading: statusQuery.isLoading || detailQuery.isLoading,
    isError: Boolean(statusQuery.error || detailQuery.error),
    hasPartialError: Boolean(roundsQuery.error || eventsQuery.error),
    errors,
    refetch: () =>
      Promise.allSettled([
        detailQuery.refetch(),
        roundsQuery.refetch(),
        eventsQuery.refetch(),
      ]),
  }
}
