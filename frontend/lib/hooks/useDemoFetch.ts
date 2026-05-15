'use client'

import { usePolling } from './usePolling'
import { Demo } from '@/lib/types'

interface UseDemoFetchResult {
  demo: Demo | null | undefined
  isLoading: boolean
  error: Error | null
  isTimeout: boolean
  failureCount: number
}

/**
 * Wrapper hook around usePolling for cleaner API.
 * Returns demo data with loading and error states.
 */
export function useDemoFetch(demoId: string): UseDemoFetchResult {
  const { data, isLoading, error, isTimeout, failureCount } = usePolling(demoId)

  return {
    demo: data,
    isLoading,
    error,
    isTimeout,
    failureCount,
  }
}
