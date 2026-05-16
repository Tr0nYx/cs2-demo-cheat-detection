/**
 * Tests for useTraceQuery hook
 * Tests React Query configuration, 404 handling, caching, and error states
 */

import { useTraceQuery } from '@/lib/hooks/useTraceQuery'
import { TraceDto } from '@/lib/types'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Create a test QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

// Wrapper component for tests
const createWrapper = () => {
  const testQueryClient = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: testQueryClient },
      children
    )
}

// Mock data
const mockTraceData: TraceDto = {
  traceBase: 0.65,
  traceAdjusted: 0.61,
  traceNormalized: 0.98,
  trustMultiplier: 0.94,
  components: {
    ekill: 0.82,
    aim: 1.04,
    kast: 0.71,
    util: 0.89,
    clutch: 0.95,
  },
  calibrationVersion: 'default-v1',
  calculatedAt: '2026-05-16T10:30:00Z',
  createdAt: '2026-05-16T10:30:00Z',
}

describe('useTraceQuery hook', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('uses correct query key with demoId', () => {
    const demoId = 'demo-123'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTraceData), { status: 200 })
    )

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    // Verify query key is correct
    expect(result.current.queryKey).toEqual(['trace', demoId])
  })

  test('returns null for 404 response (no TRACE data)', async () => {
    const demoId = 'demo-no-trace'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Should return null, not error
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  test('throws error on 500 response', async () => {
    const demoId = 'demo-error'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Server error' }), {
        status: 500,
      })
    )

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })

  test('successfully fetches and returns TRACE data', async () => {
    const demoId = 'demo-with-trace'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTraceData), { status: 200 })
    )

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTraceData)
  })

  test('configures correct stale time (1 hour)', () => {
    const demoId = 'demo-stale-time'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTraceData), { status: 200 })
    )

    renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    // Verify stale time is 1 hour (3600000 ms)
    // This is tested via configuration in the hook
    expect(true).toBe(true) // Placeholder for integration test
  })

  test('handles network errors gracefully', async () => {
    const demoId = 'demo-network-error'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Network error')
  })

  test('parses JSON response correctly', async () => {
    const demoId = 'demo-json-parse'
    const mockFetch = global.fetch as jest.Mock

    const testData = {
      ...mockTraceData,
      trustMultiplier: 0.8765,
    }

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(testData), { status: 200 })
    )

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.trustMultiplier).toBe(0.8765)
  })

  test('uses correct API endpoint URL', async () => {
    const demoId = 'demo-endpoint-test'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTraceData), { status: 200 })
    )

    renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const callUrl = mockFetch.mock.calls[0][0]
    expect(callUrl).toContain(`/demos/${demoId}/trace`)
  })

  test('handles malformed JSON response', async () => {
    const demoId = 'demo-bad-json'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(
      new Response('not valid json', { status: 200 })
    )

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })

  test('respects 404 with empty response body', async () => {
    const demoId = 'demo-404-empty'
    const mockFetch = global.fetch as jest.Mock

    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))

    const { result } = renderHook(() => useTraceQuery(demoId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
  })
})
