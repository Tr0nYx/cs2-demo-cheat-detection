'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDemoStatus } from '@/lib/api'
import { Demo } from '@/lib/types'

interface UsePollingResult {
  data: Demo | null | undefined
  isLoading: boolean
  error: Error | null
  isTimeout: boolean
  failureCount: number
}

/**
 * Custom hook for polling demo status with 2-second interval.
 * Stops polling when status is 'done' or 'error'.
 * Times out after 5 minutes.
 */
export function usePolling(demoId: string): UsePollingResult {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [failureCount, setFailureCount] = useState(0)

  // Track elapsed time for 5-minute timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(ms => ms + 1000)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const {
    data,
    isLoading,
    error,
    failureCount: queryFailureCount,
  } = useQuery({
    queryKey: ['demo', demoId],
    queryFn: () => fetchDemoStatus(demoId),
    // Poll every 2 seconds while status is 'pending'
    refetchInterval: (query: any) => {
      const demoData = query?.state?.data as Demo | undefined
      if (demoData?.status === 'pending') {
        // Stop polling if 5 minutes elapsed
        if (elapsedMs > 5 * 60 * 1000) return false
        return 2000
      }
      return false
    },
    // Retry up to 3 times with exponential backoff
    retry: (failureCount) => failureCount < 3,
    retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
    enabled: true,
  })

  // Track query failure count
  useEffect(() => {
    setFailureCount(queryFailureCount || 0)
  }, [queryFailureCount])

  return {
    data,
    isLoading,
    error: error as Error | null,
    isTimeout: elapsedMs > 5 * 60 * 1000,
    failureCount,
  }
}
