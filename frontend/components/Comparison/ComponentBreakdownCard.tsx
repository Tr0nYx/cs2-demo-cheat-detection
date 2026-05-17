'use client'

import { PercentileBadge } from '../DemoDetail/PercentileBadge'

/**
 * ComponentBreakdownCard - Displays player's 5 TRACE components with percentile rankings.
 *
 * Shows breakdown of ekill, aim, kast, util, and clutch scores with:
 * - Raw component values
 * - Percentile rank badges (color-coded)
 * - Comparison against player base
 *
 * Props:
 * - playerName: string - Name of player for card header
 * - components: Record<string, {value, percentile}> - Component data
 * - traceDatetime: string - When TRACE was calculated
 */
interface ComponentBreakdownCardProps {
  playerName: string
  components: Record<string, { value: number; percentile: number }>
  traceDatetime: string
}

const COMPONENT_DISPLAY_ORDER = ['ekill', 'aim', 'kast', 'util', 'clutch']
const COMPONENT_LABELS: Record<string, string> = {
  ekill: 'Economic Efficiency',
  aim: 'Aim Precision',
  kast: 'Kill-Assist-Survival-Trade',
  util: 'Utility Usage',
  clutch: 'Clutch Factor',
}

export function ComponentBreakdownCard({
  playerName,
  components,
  traceDatetime,
}: ComponentBreakdownCardProps) {
  const hasData = Object.keys(components).length > 0

  return (
    <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Component Breakdown</h3>
        <p className="text-sm text-gray-600 mt-1">{playerName}</p>
        {traceDatetime && (
          <p className="text-xs text-gray-500 mt-1">
            {new Date(traceDatetime).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Component list */}
      {hasData ? (
        <div className="space-y-4">
          {COMPONENT_DISPLAY_ORDER.map((componentKey) => {
            const component = components[componentKey]
            if (!component) return null

            return (
              <div key={componentKey} className="space-y-2">
                {/* Component label and value */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {COMPONENT_LABELS[componentKey] || componentKey}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {component.value.toFixed(2)}
                  </span>
                </div>

                {/* Percentile badge and bar */}
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getBarColor(
                        component.percentile
                      )}`}
                      style={{ width: `${component.percentile}%` }}
                    />
                  </div>

                  {/* Percentile badge */}
                  <PercentileBadge percentile={component.percentile} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No component data available</p>
      )}
    </div>
  )
}

/**
 * Get bar color based on percentile rank.
 *
 * - Red: 0-25% (bottom quartile)
 * - Yellow: 25-75% (middle range)
 * - Green: 75-100% (top quartile)
 */
function getBarColor(percentile: number): string {
  if (percentile < 25) {
    return 'bg-red-500'
  }
  if (percentile < 75) {
    return 'bg-yellow-500'
  }
  return 'bg-green-500'
}
