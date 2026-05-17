import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useFilteredLeaderboard } from '@/lib/hooks/useFilteredLeaderboard'

jest.setTimeout(10000)

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useFilteredLeaderboard', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        players: [
          {
            rank: 1,
            playerId: 'steam-1',
            username: 'Top Player',
            avatar: null,
            percentile95: 0.92,
            demoCount: 7,
            components: { ekill: 0.9, aim: 0.8, kast: 0.7, util: 0.6, clutch: 0.5 },
            lastAnalyzedAt: '2026-05-17T10:00:00+00:00',
          },
        ],
        total: 1,
        hasMore: false,
      }),
    }) as jest.Mock
  })

  it('initializes with default pagination and filter state', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useFilteredLeaderboard(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.filters.limit).toBe(25))
    expect(result.current.filters.offset).toBe(0)
    expect(result.current.filters.map).toBeNull()
    expect(result.current.queryKey.join('|')).toContain('leaderboard|filtered')
  })

  it('updates query key when filters change', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useFilteredLeaderboard(), {
      wrapper: createWrapper(queryClient),
    })
    const initialKey = result.current.queryKey.join('|')

    act(() => result.current.updateFilters({ map: 'Mirage', ratingBand: '10+', daysBack: 30 }))

    await waitFor(() => expect(result.current.queryKey.join('|')).not.toBe(initialKey))
    expect(result.current.filters.map).toBe('Mirage')
    expect(result.current.filters.ratingBand).toBe('10+')
    expect(result.current.filters.daysBack).toBe(30)
  })

  it('advances offset for pagination without clearing filters', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useFilteredLeaderboard({ map: 'Nuke' }), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.updateFilters({ offset: 25 }))

    await waitFor(() => expect(result.current.filters.offset).toBe(25))
    expect(result.current.filters.map).toBe('Nuke')
  })
})
