'use client'

import type { ArcTrendDto, ConsistencyTrendDto, TrendMetric, WeaponStrengthDto } from '@/lib/types'

interface TrendChartProps {
  metric: TrendMetric
  data?: ConsistencyTrendDto | ArcTrendDto | WeaponStrengthDto
  isLoading?: boolean
  error?: Error | null
}

function tone(score: number) {
  if (score < 0.33) return 'bg-green-500'
  if (score < 0.66) return 'bg-yellow-400'
  return 'bg-red-500'
}

export function TrendChart({ metric, data, isLoading = false, error = null }: TrendChartProps) {
  if (isLoading) {
    return <section className="min-h-64 rounded-lg border border-gray-800 bg-gray-950 p-4" aria-label={`${metric} loading`} />
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
        Failed to load {metric} trend
      </section>
    )
  }

  if (!data) {
    return null
  }

  if ('message' in data && data.message) {
    return (
      <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <h2 className="text-lg font-semibold text-white">{title(metric)}</h2>
        <p className="mt-3 text-sm text-gray-400">{data.message}</p>
      </section>
    )
  }

  if (metric === 'consistency') {
    return <ConsistencyChart data={data as ConsistencyTrendDto} />
  }

  if (metric === 'arc') {
    return <ArcChart data={data as ArcTrendDto} />
  }

  return <WeaponHeatmap data={data as WeaponStrengthDto} />
}

function title(metric: TrendMetric) {
  return metric === 'consistency' ? 'Consistency' : metric === 'arc' ? 'Improvement Arc' : 'Weapon Strengths'
}

export function ConsistencyChart({ data }: { data: ConsistencyTrendDto }) {
  const points = data.bands.slice(-30)
  const width = 520
  const height = 180
  const x = (index: number) => (points.length <= 1 ? 0 : (index / (points.length - 1)) * width)
  const y = (value: number) => height - value * height
  const meanPath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.meanScore)}`).join(' ')
  const upper = points.map((point, index) => `${x(index)},${y(point.upperBound)}`).join(' ')
  const lower = points.slice().reverse().map((point, index) => `${x(points.length - 1 - index)},${y(point.lowerBound)}`).join(' ')

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <h2 className="text-lg font-semibold text-white">Consistency</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-48 w-full" role="img" aria-label="Consistency variance band chart">
        <polygon points={`${upper} ${lower}`} fill="rgba(59, 130, 246, 0.25)" />
        <path d={meanPath} fill="none" stroke="#60a5fa" strokeWidth="3" />
        {points.map((point, index) => data.flaggedDates.includes(point.timestamp) && (
          <circle key={point.timestamp} cx={x(index)} cy={y(point.meanScore)} r="5" fill="#ef4444" />
        ))}
      </svg>
    </section>
  )
}

export function ArcChart({ data }: { data: ArcTrendDto }) {
  const direction = data.slope < 0 ? 'Improving' : data.slope > 0 ? 'Degrading' : 'Stable'

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <h2 className="text-lg font-semibold text-white">Improvement Arc</h2>
      <p className="mt-2 text-sm text-gray-400">{direction} ({data.slope.toFixed(4)}/demo), R2 {data.rSquared.toFixed(2)}</p>
      <div className="mt-4 h-32 rounded-md bg-gray-900 p-3 text-sm text-gray-300">
        <div>Slope: {data.slope.toFixed(4)}</div>
        <div>Intercept: {data.intercept.toFixed(2)}</div>
        <div>Outliers: {data.outliersDetected.length}</div>
      </div>
    </section>
  )
}

export function WeaponHeatmap({ data }: { data: WeaponStrengthDto }) {
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <h2 className="text-lg font-semibold text-white">Weapon Strengths</h2>
      <div className="mt-4 space-y-3">
        {Object.entries(data.strengths).map(([weapon, score]) => (
          <div key={weapon}>
            <div className="mb-1 flex justify-between text-sm text-gray-300">
              <span>{weapon}</span>
              <span>{score.toFixed(2)}</span>
            </div>
            <div className="h-3 rounded bg-gray-800">
              <div className={`h-3 rounded ${tone(score)}`} style={{ width: `${Math.max(4, score * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
