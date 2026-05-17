import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import {
  calculateEstimatedScore,
  DEFAULT_THRESHOLDS,
  useSensitivityTuner,
} from '@/lib/hooks/useSensitivityTuner'
import type { FeatureVectorsDto } from '@/lib/types'

const vectors: FeatureVectorsDto = {
  aimbotScore: 0.9,
  wallhackScore: 0.1,
  triggerbotScore: 0.8,
  recoilScore: 0.7,
  bhopScore: 0.2,
  sessionScore: 0.6,
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useSensitivityTuner', () => {
  it('calculates the weighted triggered feature score', () => {
    expect(calculateEstimatedScore(DEFAULT_THRESHOLDS, vectors)).toBeCloseTo(0.65)
  })

  it('clamps threshold updates between zero and one hundred', () => {
    const { result } = renderHook(() => useSensitivityTuner('demo-1', vectors), { wrapper })

    act(() => result.current.setThresholds({ aimbot: 125, wallhack: -10 }))

    expect(result.current.thresholds.aimbot).toBe(100)
    expect(result.current.thresholds.wallhack).toBe(0)
  })
})
