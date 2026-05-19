import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'

jest.unmock('@tanstack/react-query')

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token' },
    status: 'authenticated',
  }),
}))

import { useSteamMatchHistory } from '@/lib/hooks/useSteamMatchHistory'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useSteamMatchHistory', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        connected: false,
        status: 'disconnected',
        connected_since: null,
        last_check_at: null,
        next_check_at: null,
        known_sharecode: null,
        discovered_count: 0,
        queued_count: 0,
        imported_count: 0,
        last_error: null,
      }),
    }) as jest.Mock
  })

  it('loads status', async () => {
    const { result } = renderHook(() => useSteamMatchHistory(), { wrapper })

    await waitFor(() => expect(result.current.data?.status).toBe('disconnected'))
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/steam/match-history',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    )
  })

  it('connect sends only credential and seed', async () => {
    const { result } = renderHook(() => useSteamMatchHistory(), { wrapper })

    await act(async () => {
      await result.current.connect.mutateAsync({
        steamidkey: 'secret-code',
        seed: 'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
      })
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/steam/match-history/connect',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({
          steamidkey: 'secret-code',
          seed: 'CSGO-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
        }),
      })
    )
    expect((global.fetch as jest.Mock).mock.calls[1][1].body).not.toContain('steam_id')
  })

  it('disconnect uses delete endpoint', async () => {
    const { result } = renderHook(() => useSteamMatchHistory(), { wrapper })

    await act(async () => {
      await result.current.disconnect.mutateAsync()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/steam/match-history',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    )
  })
})
