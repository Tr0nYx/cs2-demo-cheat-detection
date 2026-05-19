'use client'

import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { FeatureThresholds, FeatureVectorsDto, SensitivityComparisonDto } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export const DEFAULT_THRESHOLDS: FeatureThresholds = {
  aimbot: 50,
  wallhack: 50,
  triggerbot: 50,
  recoil: 50,
  bhop: 50,
  session: 50,
}

export const COMPONENT_WEIGHTS = {
  aimbot: 0.25,
  wallhack: 0.25,
  triggerbot: 0.15,
  recoil: 0.2,
  bhop: 0.1,
  session: 0.05,
} as const

export function calculateEstimatedScore(thresholds: FeatureThresholds, vectors: FeatureVectorsDto): number {
  const pairs = [
    ['aimbot', vectors.aimbotScore],
    ['wallhack', vectors.wallhackScore],
    ['triggerbot', vectors.triggerbotScore],
    ['recoil', vectors.recoilScore],
    ['bhop', vectors.bhopScore],
    ['session', vectors.sessionScore],
  ] as const

  const score = pairs.reduce((total, [feature, value]) => {
    const threshold = thresholds[feature] / 100
    return total + (value > threshold ? COMPONENT_WEIGHTS[feature] : 0)
  }, 0)

  return Math.max(0, Math.min(1, score))
}

export function useSensitivityTuner(demoId: string, featureVectors: FeatureVectorsDto) {
  const { data: session } = useSession()
  const [thresholds, updateThresholds] = useState<FeatureThresholds>(DEFAULT_THRESHOLDS)
  const [comparisonResult, setComparisonResult] = useState<SensitivityComparisonDto | null>(null)

  const estimatedScore = useMemo(
    () => calculateEstimatedScore(thresholds, featureVectors),
    [thresholds, featureVectors]
  )

  const setThresholds = (newThresholds: Partial<FeatureThresholds>) => {
    updateThresholds((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(newThresholds).map(([key, value]) => [
          key,
          Math.max(0, Math.min(100, Number(value))),
        ])
      ),
    }))
  }

  const mutation = useMutation<SensitivityComparisonDto, Error, { demoId: string; adjustedThresholds: FeatureThresholds }>({
    mutationKey: ['demo', demoId, 'sensitivity-comparison'],
    mutationFn: async ({ demoId, adjustedThresholds }) => {
      const response = await fetch(`${API_BASE_URL}/analytics/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify({
          demo_id: demoId,
          adjusted_thresholds: adjustedThresholds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || 'Failed to validate comparison')
      }

      return response.json()
    },
    onSuccess: setComparisonResult,
  })

  return {
    thresholds,
    setThresholds,
    estimatedScore,
    comparisonResult,
    mutation,
    saveComparison: () => mutation.mutate({ demoId, adjustedThresholds: thresholds }),
    clearComparison: () => setComparisonResult(null),
  }
}
