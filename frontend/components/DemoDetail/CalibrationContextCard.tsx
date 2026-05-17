'use client'

import React, { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CalibrationContextCardProps {
  calibrationVersion: string
  globalAverage: number
  playerValue: number
  componentMeans?: Record<string, number> // Optional: component distribution
}

/**
 * Collapsible card explaining calibration statistics.
 *
 * Shows:
 * - Your score vs global average
 * - Difference from average
 * - Explanation of what this means
 * - Optional component distribution
 * - Calibration version
 *
 * Features:
 * - Expandable/collapsible section
 * - ARIA expanded state
 * - Keyboard accessible (Enter/Space to toggle)
 * - Responsive layout
 */
export function CalibrationContextCard({
  calibrationVersion,
  globalAverage,
  playerValue,
  componentMeans,
}: CalibrationContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const difference = playerValue - globalAverage
  const isAboveAverage = difference > 0
  const comparisonText = isAboveAverage
    ? `Higher (+${difference.toFixed(2)})`
    : `Lower (${difference.toFixed(2)})`
  const explanation = isAboveAverage
    ? 'Your TRACE adjusted score is above the global average, suggesting more suspicion signals than typical.'
    : 'Your TRACE adjusted score is below the global average, suggesting fewer suspicion signals than typical.'

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <Card>
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="calibration-content"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Calibration Context</CardTitle>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform ${
                isExpanded ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </CardHeader>
      </button>

      {isExpanded && (
        <CardContent id="calibration-content" className="space-y-4">
          {/* Main explanation */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              TRACE scores are normalized using calibration data from historical matches. This allows
              comparison across different game conditions and player skill levels.
            </p>
          </div>

          {/* Score comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Your Score
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {playerValue.toFixed(3)}
              </p>
            </div>
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Global Average
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {globalAverage.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Difference indicator */}
          <div
            className={`p-3 rounded ${
              isAboveAverage
                ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
            }`}
          >
            <p
              className={`text-sm font-medium mb-1 ${
                isAboveAverage
                  ? 'text-red-900 dark:text-red-100'
                  : 'text-green-900 dark:text-green-100'
              }`}
            >
              Difference from Average
            </p>
            <p
              className={`text-lg font-semibold ${
                isAboveAverage
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-green-700 dark:text-green-300'
              }`}
            >
              {comparisonText}
            </p>
          </div>

          {/* Explanation */}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p>{explanation}</p>
          </div>

          {/* Component distribution (optional) */}
          {componentMeans && Object.keys(componentMeans).length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Component Distribution
              </p>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(componentMeans).map(([component, mean]) => (
                  <div
                    key={component}
                    className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-center"
                  >
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-1">
                      {component}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {(mean as number).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calibration version */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Calibration Version:</span>{' '}
              <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded text-xs font-mono">
                {calibrationVersion}
              </code>
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
