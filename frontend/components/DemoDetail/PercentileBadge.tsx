'use client'

import React, { useState } from 'react'

interface PercentileBadgeProps {
  percentile: number | null // 0-100 or null if insufficient data
  componentName?: string // e.g., "AIM", "KAST"
  showTooltip?: boolean // default true
  className?: string
}

/**
 * Visual badge showing percentile rank with color coding.
 *
 * Features:
 * - Color-coded: red (0-25%), yellow (25-75%), green (75-100%)
 * - Shows percentile value or "N/A" if null
 * - Optional tooltip explaining percentile
 * - Optional component name label
 * - Hover effect
 */
export function PercentileBadge({
  percentile,
  componentName,
  showTooltip = true,
  className = '',
}: PercentileBadgeProps) {
  const [showTooltipContent, setShowTooltipContent] = useState(false)

  // Determine color based on percentile
  const getColorClass = (
    value: number | null
  ): {
    bgColor: string
    textColor: string
    borderColor: string
  } => {
    if (value === null) {
      return {
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-600 dark:text-gray-400',
        borderColor: 'border-gray-300 dark:border-gray-600',
      }
    }

    if (value < 25) {
      return {
        bgColor: 'bg-red-100 dark:bg-red-950',
        textColor: 'text-red-700 dark:text-red-300',
        borderColor: 'border-red-300 dark:border-red-700',
      }
    } else if (value < 75) {
      return {
        bgColor: 'bg-yellow-100 dark:bg-yellow-950',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
      }
    } else {
      return {
        bgColor: 'bg-green-100 dark:bg-green-950',
        textColor: 'text-green-700 dark:text-green-300',
        borderColor: 'border-green-300 dark:border-green-700',
      }
    }
  }

  const colors = getColorClass(percentile)
  const displayText = percentile !== null ? `${Math.round(percentile)}%ile` : 'N/A'

  const tooltipText =
    percentile !== null
      ? `Better than ${Math.round(percentile)}% of players`
      : 'Insufficient data for percentile calculation'

  return (
    <div className={`inline-block relative ${className}`}>
      <div
        className={`${colors.bgColor} ${colors.textColor} border ${colors.borderColor} rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap cursor-help hover:shadow-md transition-shadow`}
        role="img"
        aria-label={tooltipText}
        onMouseEnter={() => setShowTooltipContent(true)}
        onMouseLeave={() => setShowTooltipContent(false)}
        onFocus={() => setShowTooltipContent(true)}
        onBlur={() => setShowTooltipContent(false)}
        tabIndex={0}
      >
        {componentName && <span className="opacity-75">{componentName}: </span>}
        {displayText}
      </div>

      {/* Tooltip */}
      {showTooltip && showTooltipContent && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none shadow-lg">
          {tooltipText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      )}
    </div>
  )
}
