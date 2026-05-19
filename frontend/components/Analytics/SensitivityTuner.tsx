'use client'

import type { FeatureThresholds, FeatureVectorsDto } from '@/lib/types'
import { DEFAULT_THRESHOLDS, COMPONENT_WEIGHTS, useSensitivityTuner } from '@/lib/hooks/useSensitivityTuner'
import { Button } from '@/components/ui/button'
import { Copy, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { ConsolePanel } from '@/components/Console'

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
  if (score < 0.33) return 'text-signal-low'
  if (score < 0.66) return 'text-signal-medium'
  return 'text-signal-high'
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
      <ConsolePanel
        title="Sensitivity Tuner"
        description="Feature vectors are not available for this demo."
      >
        <p className="text-sm text-muted-foreground p-4 bg-surface-raised border border-border-subtle rounded-lg">
          Feature vectors are not available for this demo.
        </p>
      </ConsolePanel>
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
    <ConsolePanel
      title="Sensitivity Tuner"
      description="Adjust thresholds to preview how suspicion scoring responds."
      action={
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground uppercase">Calibration Mode</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tuner Metrics Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-surface-raised border border-border-subtle rounded-lg">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Default</div>
            <div className="text-lg font-mono font-semibold text-foreground">{baseline.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Estimated</div>
            <div className={`text-lg font-mono font-bold ${scoreColor(estimatedScore)}`}>{estimatedScore.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Difference</div>
            <div className={`text-lg font-mono font-semibold ${difference >= 0 ? 'text-signal-high' : 'text-signal-low'}`}>
              {difference >= 0 ? '+' : ''}{difference.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Feature Tuners Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature) => {
            const vector = featureVectors[feature.scoreKey]
            const threshold = thresholds[feature.key]
            const triggered = vector > threshold / 100

            return (
              <div key={feature.key} className="rounded-lg border border-border-subtle bg-surface-panel p-4 flex flex-col justify-between">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground" title={`Contributes ${COMPONENT_WEIGHTS[feature.key] * 100}% to suspicion`}>
                    {feature.label}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${triggered ? 'bg-signal-high-bg border border-signal-high/35 text-signal-high' : 'bg-surface-raised border border-border-subtle text-muted-foreground'}`}>
                    {triggered ? 'Triggered' : 'Below threshold'}
                  </span>
                </div>

                <input
                  aria-label={`${feature.label} threshold`}
                  type="range"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(event) => setThresholds({ [feature.key]: Number(event.target.value) } as Partial<FeatureThresholds>)}
                  className="w-full h-1.5 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className="mt-3 flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Threshold: {threshold}</span>
                  <span>Score: {vector.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setThresholds(DEFAULT_THRESHOLDS)} className="border-border-subtle hover:bg-surface-raised text-foreground">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button type="button" onClick={handleSave} disabled={!changed || saving} className="bg-primary hover:bg-primary/95 text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Comparison
          </Button>
        </div>

        {/* Save Error */}
        {mutation.error && (
          <div className="rounded-md border border-signal-high/35 bg-signal-high-bg p-3 text-sm text-signal-high">
            Failed to save comparison: {mutation.error.message}
          </div>
        )}

        {/* Comparison Result / Active Comparison Details */}
        {comparisonResult && (
          <div className="rounded-lg border border-border-subtle bg-surface-raised p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Validated Comparison</h3>

            <div className="grid gap-4 grid-cols-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Baseline Suspicion</div>
                <div className="text-base font-mono font-semibold text-foreground">{comparisonResult.baselineSuspicion.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tuned Suspicion</div>
                <div className={`text-base font-mono font-bold ${scoreColor(comparisonResult.tunedSuspicion)}`}>
                  {comparisonResult.tunedSuspicion.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Difference</div>
                <div className={`text-base font-mono font-semibold ${(comparisonResult.tunedSuspicion - comparisonResult.baselineSuspicion) >= 0 ? 'text-signal-high' : 'text-signal-low'}`}>
                  {(comparisonResult.tunedSuspicion - comparisonResult.baselineSuspicion) >= 0 ? '+' : ''}
                  {(comparisonResult.tunedSuspicion - comparisonResult.baselineSuspicion).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="overflow-hidden border border-border-subtle rounded-lg">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="bg-surface-panel border-b border-border-subtle text-muted-foreground">
                    <th className="p-3 font-semibold">Feature</th>
                    <th className="p-3 font-semibold text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-panel/50">
                  {FEATURES.map((feature) => {
                    const impact = comparisonResult.impactBreakdown[feature.key] ?? 0

                    return (
                      <tr key={feature.key} className="hover:bg-surface-panel transition-colors">
                        <td className="p-3 font-medium text-foreground">{feature.label}</td>
                        <td className={`p-3 text-right font-semibold ${impact >= 0 ? 'text-signal-high' : 'text-signal-low'}`}>
                          {impact >= 0 ? '+' : ''}{impact.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleCopy} className="border-border-subtle hover:bg-surface-raised text-foreground">
                <Copy className="h-4 w-4 mr-2" />
                Copy Comparison
              </Button>
              <Button type="button" variant="outline" onClick={clearComparison} className="border-border-subtle hover:bg-surface-raised text-foreground">
                Adjust More
              </Button>
            </div>
          </div>
        )}
      </div>
    </ConsolePanel>
  )
}
