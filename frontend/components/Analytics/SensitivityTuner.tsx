'use client'

import type { FeatureThresholds, FeatureVectorsDto } from '@/lib/types'
import { DEFAULT_THRESHOLDS, COMPONENT_WEIGHTS, useSensitivityTuner } from '@/lib/hooks/useSensitivityTuner'
import { Button } from '@/components/ui/button'
import { Copy, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
  const {
    thresholds,
    setThresholds,
    estimatedScore,
    comparisonResult,
    mutation,
    saveComparison,
    clearComparison,
  } = useSensitivityTuner(demoId, featureVectors)
  const baseline = baselineSuspicion ?? 0
  const difference = estimatedScore - baseline
  const changed = Math.abs(difference) >= 0.01
  const saving = isSaving || mutation.isPending

  const handleSave = () => {
    onSave?.()
    saveComparison()
  }

  const handleCopy = async () => {
    if (comparisonResult && navigator.clipboard) {
      await navigator.clipboard.writeText(JSON.stringify(comparisonResult, null, 2))
    }
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
        <Button type="button" onClick={handleSave} disabled={!changed || saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Comparison
        </Button>
      </div>

      {mutation.error && (
        <div className="mt-4 rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          Failed to save comparison: {mutation.error.message}
        </div>
      )}

      {comparisonResult && (
        <div className="mt-5 rounded-md border border-blue-900 bg-blue-950/30 p-4">
          <h3 className="text-sm font-semibold text-blue-100">Validated Comparison</h3>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-blue-300/70">Baseline Suspicion</div>
              <div className="text-lg text-white">{comparisonResult.baselineSuspicion.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-blue-300/70">Tuned Suspicion</div>
              <div className={`text-lg font-semibold ${scoreColor(comparisonResult.tunedSuspicion)}`}>
                {comparisonResult.tunedSuspicion.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-blue-300/70">Difference</div>
              <div className={comparisonResult.tunedSuspicion >= comparisonResult.baselineSuspicion ? 'text-red-300' : 'text-green-300'}>
                {(comparisonResult.tunedSuspicion - comparisonResult.baselineSuspicion) >= 0 ? '+' : ''}
                {(comparisonResult.tunedSuspicion - comparisonResult.baselineSuspicion).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-blue-100">
              <thead className="text-blue-300/70">
                <tr>
                  <th className="py-2 pr-3 font-medium">Feature</th>
                  <th className="py-2 pr-3 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => {
                  const impact = comparisonResult.impactBreakdown[feature.key] ?? 0

                  return (
                    <tr key={feature.key} className="border-t border-blue-900/60">
                      <td className="py-2 pr-3">{feature.label}</td>
                      <td className={impact >= 0 ? 'py-2 pr-3 text-red-300' : 'py-2 pr-3 text-green-300'}>
                        {impact >= 0 ? '+' : ''}{impact.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              Copy Comparison
            </Button>
            <Button type="button" variant="outline" onClick={clearComparison}>
              Adjust More
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
