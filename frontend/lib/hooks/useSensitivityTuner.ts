'use client'

import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { FeatureThresholds, FeatureVectorsDto, SensitivityComparisonDto } from '@/lib/types'

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

  const mutation = useMutation({
    mutationKey: ['demo', demoId, 'sensitivity-comparison'],
    mutationFn: async (): Promise<SensitivityComparisonDto> => ({
      baselineSuspicion: calculateEstimatedScore(DEFAULT_THRESHOLDS, featureVectors),
      tunedSuspicion: estimatedScore,
      impactBreakdown: {},
    }),
    onSuccess: setComparisonResult,
  })

  return {
    thresholds,
    setThresholds,
    estimatedScore,
    comparisonResult,
    mutation,
    saveComparison: () => mutation.mutate(),
  }
}
