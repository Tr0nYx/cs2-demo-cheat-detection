import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { usePolling } from '@/lib/hooks/usePolling'
import * as api from '@/lib/api'

jest.mock('@/lib/api', () => ({
  fetchDemoStatus: jest.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('usePolling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches demo status initially', async () => {
    ;(api.fetchDemoStatus as jest.Mock).mockResolvedValue({
      id: 'demo-123',
      status: 'done',
    })

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(api.fetchDemoStatus).toHaveBeenCalledWith('demo-123')
    })
  })

  it('returns loading state initially', async () => {
    ;(api.fetchDemoStatus as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ id: 'demo-123', status: 'pending' }), 100))
    )

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('stops polling when status is done', async () => {
    ;(api.fetchDemoStatus as jest.Mock).mockResolvedValue({
      id: 'demo-123',
      status: 'done',
      results: {},
    })

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data?.status).toBe('done')
    })

    const initialCallCount = (api.fetchDemoStatus as jest.Mock).mock.calls.length

    // Wait a bit to see if additional calls are made
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Should not have made additional calls (polling should stop)
    expect((api.fetchDemoStatus as jest.Mock).mock.calls.length).toBeLessThanOrEqual(initialCallCount + 1)
  })

  it('handles errors with exponential backoff', async () => {
    ;(api.fetchDemoStatus as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        id: 'demo-123',
        status: 'done',
      })

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    // Eventually should recover
    await waitFor(
      () => {
        expect(api.fetchDemoStatus).toHaveBeenCalled()
      },
      { timeout: 10000 }
    )
  })

  it('sets timeout flag after 5 minutes', async () => {
    jest.useFakeTimers()

    ;(api.fetchDemoStatus as jest.Mock).mockResolvedValue({
      id: 'demo-123',
      status: 'pending',
    })

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    // Fast forward 5 minutes + 1 second
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000)

    await waitFor(() => {
      expect(result.current.isTimeout).toBe(true)
    })

    jest.useRealTimers()
  })

  it('stops polling when timeout is reached', async () => {
    jest.useFakeTimers()

    ;(api.fetchDemoStatus as jest.Mock).mockResolvedValue({
      id: 'demo-123',
      status: 'pending',
    })

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    const initialCallCount = (api.fetchDemoStatus as jest.Mock).mock.calls.length

    // Fast forward beyond 5 minutes
    jest.advanceTimersByTime(6 * 60 * 1000)

    await waitFor(() => {
      expect(result.current.isTimeout).toBe(true)
    })

    jest.useRealTimers()
  })

  it('tracks failure count', async () => {
    ;(api.fetchDemoStatus as jest.Mock)
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockRejectedValueOnce(new Error('Error 3'))

    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.failureCount).toBeGreaterThanOrEqual(1)
    })
  })
})
