'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TraceComponentDto, TraceComponentPercentilesDto } from '@/lib/types'

interface TraceChartProps {
  components: TraceComponentDto
  percentiles: TraceComponentPercentilesDto
  calibrationMean?: number // Optional: reference line for baseline
}

interface ChartDataItem {
  name: string
  value: number
  percentile: number | null
  fullName: string
}

/**
 * Custom tooltip component showing value, percentile, and mean
 */
function CustomTooltip({
  active,
  payload,
  calibrationMean,
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ value: number; payload: any }>
  calibrationMean: number
}) {
  if (active && payload && payload[0]) {
    const item = payload[0].payload as ChartDataItem
    const delta = item.value - calibrationMean
    const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 shadow-lg z-50">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {item.name}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Score: <span className="font-mono font-semibold">{item.value.toFixed(2)}</span>
        </p>
        {item.percentile !== null && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Percentile: <span className="font-mono font-semibold">{Math.round(item.percentile)}%ile</span>
          </p>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-300">
          vs. Mean: <span className="font-mono font-semibold">{deltaStr}</span>
        </p>
      </div>
    )
  }
  return null
}

/**
 * Interactive bar chart showing TRACE component scores with color coding.
 *
 * Features:
 * - Horizontal bar chart with component names on Y-axis
 * - Component values (0.3-2.0) on X-axis
 * - Reference line at 1.0 (baseline)
 * - Color coding by suspicion level (red/yellow/green)
 * - Hover tooltips showing value, percentile, mean
 * - Mobile responsive
 * - Full accessibility support (ARIA, keyboard nav)
 */
export function TraceChart({
  components,
  percentiles,
  calibrationMean = 1.0,
}: TraceChartProps) {
  // Prepare data for chart
  const data = useMemo(
    () => [
      {
        name: 'E-Kill',
        value: components.ekill,
        percentile: percentiles.ekill,
        fullName: 'e-kill',
      },
      {
        name: 'AIM',
        value: components.aim,
        percentile: percentiles.aim,
        fullName: 'aim',
      },
      {
        name: 'KAST',
        value: components.kast,
        percentile: percentiles.kast,
        fullName: 'kast',
      },
      {
        name: 'Utility',
        value: components.util,
        percentile: percentiles.util,
        fullName: 'util',
      },
      {
        name: 'Clutch',
        value: components.clutch,
        percentile: percentiles.clutch,
        fullName: 'clutch',
      },
    ],
    [components, percentiles]
  )


  return (
    <div className="w-full space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          aria-label="TRACE component scores bar chart"
          role="img"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            domain={[0.3, 2.0]}
            label={{
              value: 'Component Score',
              position: 'insideBottomRight',
              offset: -5,
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={60}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            content={<CustomTooltip calibrationMean={calibrationMean} />}
          />
          <ReferenceLine
            x={1.0}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{
              value: 'Baseline (1.0)',
              position: 'top',
              fill: '#6b7280',
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="value"
            fill="#8884d8"
            shape={<BarShape />}
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend explaining color coding */}
      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Suspicion Levels
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">High (0.3-0.6)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Neutral (0.6-1.4)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Low (1.4-2.0)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Custom bar shape that applies color based on value
 */
interface BarShapeProps extends React.SVGProps<SVGRectElement> {
  getColor?: (value: number) => string
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
}

function BarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
}: BarShapeProps) {
  if (!payload) return null

  // Determine color based on value
  let color = '#8884d8'
  if (payload.value < 0.6) {
    color = '#dc2626' // red-600
  } else if (payload.value < 1.4) {
    color = '#f59e0b' // amber-500
  } else {
    color = '#16a34a' // green-600
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      rx={4}
      ry={4}
      className="hover:opacity-80 transition-opacity"
      role="img"
      aria-label={`${payload.value.toFixed(2)}`}
      tabIndex={0}
    />
  )
}
