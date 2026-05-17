'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

/**
 * TrendCard - Displays TRACE trend over last 10 demos with sparkline chart.
 *
 * Shows historical TRACE scores with:
 * - Line chart visualization (recharts)
 * - Trending direction indicator (up/down)
 * - Tooltip with date and value on hover
 *
 * Props:
 * - playerName: string - Name of player for card header
 * - history: Array<{date, value}> - Historical TRACE scores
 * - trending: boolean - True if trending up (latest > oldest)
 */
interface TrendCardProps {
  playerName: string
  history: Array<{ date: string; value: number }>
  trending: boolean
}

export function TrendCard({ playerName, history, trending }: TrendCardProps) {
  const hasData = history && history.length > 0

  // Format dates for display
  const chartData = hasData
    ? history.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: item.value,
      }))
    : []

  const trendColor = trending ? '#10b981' : '#ef4444' // green if up, red if down
  const trendLabel = trending ? 'Improving' : 'Declining'

  return (
    <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">TRACE Trend</h3>
            <p className="text-sm text-gray-600 mt-1">{playerName}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            trending ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {trendLabel}
          </div>
        </div>
      </div>

      {/* Chart or empty state */}
      {hasData ? (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#d1d5db"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#d1d5db"
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value) => [(value as number).toFixed(2), 'TRACE']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={2}
                dot={{ fill: trendColor, r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-sm text-gray-500">No trend data available</p>
        </div>
      )}
    </div>
  )
}
