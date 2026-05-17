'use client'

import type { FeatureThresholds, FeatureVectorsDto } from '@/lib/types'
import { DEFAULT_THRESHOLDS, COMPONENT_WEIGHTS, useSensitivityTuner } from '@/lib/hooks/useSensitivityTuner'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react'

const FEATURES: Array<{
  key: keyof FeatureThresholds
  scoreKey: keyof FeatureVectorsDto
  label: string
}> = [
  { key: 'aimbot', scoreKey: 'aimbotScore', label: 'Aimbot' },
  { key: 'wallhack', scoreKey: 'wallhackScore', label: 'Wallhack' },
  { key: 'triggerbot', scoreKey: 'triggerbotScore', label: 'Triggerbot' },
  { key: 'recoil', scoreKey: 'recoilScore', label: 'Recoil' },
  { key: 'bhop', scoreKey: 'bhopScore', label: 'Bhop' },
  { key: 'session', scoreKey: 'sessionScore', label: 'Session' },
]

interface SensitivityTunerProps {
  demoId: string
  featureVectors: FeatureVectorsDto | null
  baselineSuspicion?: number | null
  onSave?: () => void
  isSaving?: boolean
}

function scoreColor(score: number) {
  if (score < 0.33) return 'text-green-400'
  if (score < 0.66) return 'text-yellow-300'
  return 'text-red-400'
}

export function SensitivityTuner({
  demoId,
  featureVectors,
  baselineSuspicion = null,
  onSave,
  isSaving = false,
}: SensitivityTunerProps) {
  if (!featureVectors) {
    return (
      <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <h2 className="text-lg font-semibold text-white">Sensitivity Tuner</h2>
        <p className="mt-2 text-sm text-gray-400">Feature vectors are not available for this demo.</p>
      </section>
    )
  }

  return (
    <SensitivityTunerContent
      demoId={demoId}
      featureVectors={featureVectors}
      baselineSuspicion={baselineSuspicion}
      onSave={onSave}
      isSaving={isSaving}
    />
  )
}

function SensitivityTunerContent({
  demoId,
  featureVectors,
  baselineSuspicion = null,
  onSave,
  isSaving = false,
}: SensitivityTunerProps & { featureVectors: FeatureVectorsDto }) {
  const { thresholds, setThresholds, estimatedScore, saveComparison } = useSensitivityTuner(demoId, featureVectors)
  const baseline = baselineSuspicion ?? 0
  const difference = estimatedScore - baseline
  const changed = Math.abs(difference) > 0.001

  const handleSave = () => {
    onSave?.()
    saveComparison()
  }

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <div className="mb-4 flex items-start gap-3">
        <SlidersHorizontal className="mt-1 h-5 w-5 text-blue-300" />
        <div>
          <h2 className="text-lg font-semibold text-white">Sensitivity Tuner</h2>
          <p className="text-sm text-gray-400">Adjust thresholds to preview how suspicion scoring responds.</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-md bg-gray-900 p-3 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase text-gray-500">Default</div>
          <div className="text-lg text-gray-200">{baseline.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Estimated</div>
          <div className={`text-lg font-semibold ${scoreColor(estimatedScore)}`}>{estimatedScore.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Difference</div>
          <div className={difference >= 0 ? 'text-red-300' : 'text-green-300'}>
            {difference >= 0 ? '+' : ''}{difference.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURES.map((feature) => {
          const vector = featureVectors[feature.scoreKey]
          const threshold = thresholds[feature.key]
          const triggered = vector > threshold / 100

          return (
            <label key={feature.key} className="rounded-md border border-gray-800 bg-gray-900 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-200" title={`Contributes ${COMPONENT_WEIGHTS[feature.key] * 100}% to suspicion`}>
                  {feature.label}
                </span>
                <span className={triggered ? 'text-xs text-red-300' : 'text-xs text-green-300'}>
                  {triggered ? 'Triggered' : 'Safe'}
                </span>
              </div>
              <input
                aria-label={`${feature.label} threshold`}
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(event) => setThresholds({ [feature.key]: Number(event.target.value) } as Partial<FeatureThresholds>)}
                className="w-full"
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Threshold: {threshold}</span>
                <span>Score: {vector.toFixed(2)}</span>
              </div>
            </label>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}>
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button type="button" onClick={handleSave} disabled={!changed || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Comparison
        </Button>
      </div>
    </section>
  )
}
