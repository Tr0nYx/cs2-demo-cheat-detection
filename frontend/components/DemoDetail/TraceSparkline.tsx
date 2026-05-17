'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TraceHistoryDto } from '@/lib/types'

interface TraceSparklineProps {
  history: TraceHistoryDto[]
  height?: number // default 100px
  width?: string // default 100%
  showTrend?: boolean // Show trend label (improving/declining)
}

/**
 * Compact line chart showing TRACE adjusted score trend over time.
 *
 * Features:
 * - Recharts LineChart minimal styling (sparkline style)
 * - X-axis: demo number (1, 2, 3, ... N)
 * - Y-axis: trace_adjusted value (auto-scaled)
 * - Line color based on trend direction:
 *   - Green if trending up (improving)
 *   - Red if trending down (declining)
 *   - Gray if flat
 * - Hover tooltip showing date, value, delta from previous
 * - Mobile responsive (scales proportionally)
 * - Optional trend indicator text
 */
export function TraceSparkline({
  history,
  height = 100,
  width = '100%',
  showTrend = true,
}: TraceSparklineProps) {
  // Prepare data for chart
  const { data, trend } = useMemo(() => {
    if (!history || history.length === 0) {
      return { data: [], trend: 'flat' as const }
    }

    // Create numbered demo entries with deltas
    const chartData = history.map((item, index) => {
      const prev = index > 0 ? history[index - 1].traceAdjusted : item.traceAdjusted
      const delta = item.traceAdjusted - prev

      return {
        demo: index + 1,
        value: item.traceAdjusted,
        delta,
        date: new Date(item.calculatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }
    })

    // Calculate trend: compare first vs last values
    let trendDirection: 'improving' | 'declining' | 'flat' = 'flat'
    if (chartData.length > 1) {
      const firstValue = chartData[0].value
      const lastValue = chartData[chartData.length - 1].value
      const threshold = 0.01 // 1% threshold for meaningful change

      if (lastValue > firstValue * (1 + threshold)) {
        trendDirection = 'improving'
      } else if (lastValue < firstValue * (1 - threshold)) {
        trendDirection = 'declining'
      }
    }

    return { data: chartData, trend: trendDirection }
  }, [history])

  /**
   * Get line color based on trend
   */
  const getLineColor = (): string => {
    switch (trend) {
      case 'improving':
        return '#16a34a' // green-600
      case 'declining':
        return '#dc2626' // red-600
      default:
        return '#6b7280' // gray-500
    }
  }

  /**
   * Get trend text and icon
   */
  const getTrendText = (): { text: string; icon: string } => {
    switch (trend) {
      case 'improving':
        return { text: 'Improving', icon: '↑' }
      case 'declining':
        return { text: 'Declining', icon: '↓' }
      default:
        return { text: 'Stable', icon: '→' }
    }
  }

  /**
   * Custom tooltip component
   */
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ value: number; payload: (typeof data)[0] }>
  }) => {
    if (active && payload && payload[0]) {
      const { payload: item } = payload[0]

      return (
        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            Demo {item.demo}: {item.date}
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            TRACE: <span className="font-mono">{item.value.toFixed(3)}</span>
          </p>
          {item.delta !== 0 && (
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Change: <span className="font-mono">{item.delta > 0 ? '+' : ''}{item.delta.toFixed(3)}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Handle empty history
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded p-4"
        style={{ height: `${height}px`, width }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No historical data available
        </p>
      </div>
    )
  }

  const trendInfo = getTrendText()

  return (
    <div className="w-full space-y-2">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          aria-label="TRACE score trend sparkline"
          role="img"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="demo"
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
          />
          <YAxis
            domain="dataMin"
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={getLineColor()}
            strokeWidth={2}
            isAnimationActive={true}
            dot={false}
            animationDuration={300}
            aria-label={`TRACE trend ${trend}`}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Trend indicator */}
      {showTrend && (
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`font-semibold ${
              trend === 'improving'
                ? 'text-green-600 dark:text-green-400'
                : trend === 'declining'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {trendInfo.icon} {trendInfo.text}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({data.length} demos)
          </span>
        </div>
      )}
    </div>
  )
}
