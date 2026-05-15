import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { usePolling } from '@/lib/hooks/usePolling'

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

  it('renders hook without errors', async () => {
    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
    expect(result.current).toHaveProperty('data')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('isTimeout')
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isTimeout).toBe(false)
    expect(result.current.failureCount).toBe(0)
  })

  it('tracks failure count property', () => {
    const { result } = renderHook(() => usePolling('demo-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current.failureCount).toBeGreaterThanOrEqual(0)
  })
})
