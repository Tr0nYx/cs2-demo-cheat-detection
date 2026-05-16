'use client'

import { TraceComponentDto } from '@/lib/types'

interface TraceComponentChartProps {
  components: TraceComponentDto
  trustMultiplier?: number
}

/**
 * Displays TRACE component scores in a table format.
 *
 * Components range from 0.3 to 2.0:
 * - 0.3-0.6: Red (high suspicion)
 * - 0.6-1.4: Yellow (neutral)
 * - 1.4-2.0: Green (low suspicion)
 *
 * Shows:
 * - Component name
 * - Raw score
 * - Visual bar indicator
 * - Percentage of range
 */
export function TraceComponentChart({
  components,
  trustMultiplier,
}: TraceComponentChartProps) {
  const componentList = [
    { label: 'E-Kill', value: components.ekill, key: 'ekill' },
    { label: 'AIM', value: components.aim, key: 'aim' },
    { label: 'KAST', value: components.kast, key: 'kast' },
    { label: 'Utility', value: components.util, key: 'util' },
    { label: 'Clutch', value: components.clutch, key: 'clutch' },
  ]

  /**
   * Get color indicator based on component value
   * 0.3-0.6: Red (high suspicion)
   * 0.6-1.4: Yellow (neutral)
   * 1.4-2.0: Green (low suspicion)
   */
  const getColorClass = (
    value: number
  ): {
    bgColor: string
    barColor: string
    textColor: string
    interpretation: string
  } => {
    if (value < 0.6) {
      return {
        bgColor: 'bg-red-50 dark:bg-red-950',
        barColor: 'bg-red-500',
        textColor: 'text-red-700 dark:text-red-300',
        interpretation: 'High Suspicion',
      }
    } else if (value < 1.4) {
      return {
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        barColor: 'bg-yellow-500',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        interpretation: 'Neutral',
      }
    } else {
      return {
        bgColor: 'bg-green-50 dark:bg-green-950',
        barColor: 'bg-green-500',
        textColor: 'text-green-700 dark:text-green-300',
        interpretation: 'Low Suspicion',
      }
    }
  }

  /**
   * Calculate bar width as percentage of full range (0.3 to 2.0)
   */
  const getBarWidth = (value: number): number => {
    const min = 0.3
    const max = 2.0
    const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    return normalized
  }

  const formatNumber = (num: number): string => num.toFixed(2)

  return (
    <div className="space-y-3">
      {/* Component rows */}
      {componentList.map(({ label, value, key }) => {
        const colorInfo = getColorClass(value)
        const barWidth = getBarWidth(value)

        return (
          <div key={key} className={`p-3 rounded ${colorInfo.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {label}
              </span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-semibold">
                  {formatNumber(value)}
                </code>
                <span className={`text-xs font-medium ${colorInfo.textColor}`}>
                  {colorInfo.interpretation}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${colorInfo.barColor} transition-all duration-300`}
                style={{ width: `${barWidth}%` }}
                role="progressbar"
                aria-valuenow={Math.round(barWidth)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} component score at ${formatNumber(value)}`}
              />
            </div>

            {/* Scale labels */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0.3</span>
              <span>1.15</span>
              <span>2.0</span>
            </div>
          </div>
        )
      })}

      {/* Trust multiplier note */}
      {trustMultiplier && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Trust Multiplier:</span> {trustMultiplier.toFixed(4)} applied to calculate final TRACE scores
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Score Interpretation</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">0.3-0.6: High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">0.6-1.4: Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">1.4-2.0: Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}
