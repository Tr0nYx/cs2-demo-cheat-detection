import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useFilteredDemos } from '@/lib/hooks/useFilteredDemos'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token' },
    status: 'authenticated',
  }),
}))

jest.setTimeout(10000)

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useFilteredDemos', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        demos: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      }),
    }) as jest.Mock
  })

  it('initializes with empty filters', async () => {
    const { result } = renderHook(() => useFilteredDemos(), { wrapper })

    await waitFor(() => expect(result.current.filters.limit).toBe(20))
    expect(result.current.filters.offset).toBe(0)
    expect(result.current.filters.map).toBeNull()
  })

  it('loads last filter combo from localStorage', async () => {
    localStorage.setItem('cs2cd_filter_history', JSON.stringify([{ map: 'Mirage', limit: 20, offset: 0 }]))

    const { result } = renderHook(() => useFilteredDemos(), { wrapper })

    await waitFor(() => expect(result.current.filters.map).toBe('Mirage'))
  })

  it('persists updated filters to localStorage', async () => {
    const { result } = renderHook(() => useFilteredDemos(), { wrapper })

    act(() => result.current.updateFilters({ map: 'Mirage' }))

    const stored = JSON.parse(localStorage.getItem('cs2cd_filter_history') ?? '[]')
    expect(stored[0].map).toBe('Mirage')
  })

  it('keeps max five history items', async () => {
    const { result } = renderHook(() => useFilteredDemos(), { wrapper })

    for (const map of ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Vertigo', 'Dust2']) {
      act(() => result.current.updateFilters({ map }))
    }

    const stored = JSON.parse(localStorage.getItem('cs2cd_filter_history') ?? '[]')
    expect(stored).toHaveLength(5)
  })

  it('changes query key when a filter changes', async () => {
    const { result } = renderHook(() => useFilteredDemos(), { wrapper })
    const initialKey = result.current.queryKey.join('|')

    act(() => result.current.updateFilters({ map: 'Mirage' }))

    await waitFor(() => expect(result.current.queryKey.join('|')).not.toBe(initialKey))
  })

  it('exposes an error field for API failures', () => {
    const { result } = renderHook(() => useFilteredDemos(), { wrapper })

    expect(result.current.error).toBeNull()
  })
})
