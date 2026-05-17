'use client'

import type { FilterTimeframe, LeaderboardFilterCriteria, RatingBand } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

const MAPS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Vertigo', 'Dust2', 'Anubis']

const RATING_BANDS: Array<{ value: RatingBand | null; label: string }> = [
  { value: null, label: 'All ratings' },
  { value: '0-5', label: '0-5 RWS' },
  { value: '5-10', label: '5-10 RWS' },
  { value: '10+', label: '10+ RWS' },
]

const TIMEFRAMES: Array<{ value: FilterTimeframe | null; label: string }> = [
  { value: null, label: 'All-time' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

interface LeaderboardFiltersProps {
  filters: LeaderboardFilterCriteria
  onFilterChange: (newFilters: Partial<LeaderboardFilterCriteria>) => void
  isLoading?: boolean
}

function mapButtonClass(selected: boolean) {
  return [
    'rounded-md border px-3 py-2 text-sm transition-colors',
    selected
      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100'
      : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 hover:bg-gray-800',
  ].join(' ')
}

function selectValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? 'all' : String(value)
}

export function LeaderboardFilters({
  filters,
  onFilterChange,
  isLoading = false,
}: LeaderboardFiltersProps) {
  const selectedMap = filters.map ?? null

  return (
    <section
      aria-label="Leaderboard filters"
      className="rounded-lg border border-gray-800 bg-gray-950/80 p-4"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Leaderboard Scope</h2>
          <p className="mt-1 text-sm text-gray-400">Rank players by 95th percentile TRACE within the selected segment.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => onFilterChange({ map: null, ratingBand: null, daysBack: null, offset: 0 })}
          aria-label="Clear leaderboard filters"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr_1fr]">
        <fieldset disabled={isLoading}>
          <legend className="mb-2 text-sm font-medium text-gray-200">Map</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              className={mapButtonClass(selectedMap === null)}
              onClick={() => onFilterChange({ map: null })}
            >
              All maps
            </button>
            {MAPS.map((map) => (
              <button
                key={map}
                type="button"
                className={mapButtonClass(selectedMap === map)}
                onClick={() => onFilterChange({ map })}
              >
                {map}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-200">Rating Band</span>
          <select
            className="h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100 disabled:opacity-50"
            value={selectValue(filters.ratingBand)}
            disabled={isLoading}
            onChange={(event) => onFilterChange({
              ratingBand: event.target.value === 'all' ? null : event.target.value as RatingBand,
            })}
          >
            {RATING_BANDS.map((option) => (
              <option key={option.label} value={selectValue(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-200">Timeframe</span>
          <select
            className="h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100 disabled:opacity-50"
            value={selectValue(filters.daysBack)}
            disabled={isLoading}
            onChange={(event) => onFilterChange({
              daysBack: event.target.value === 'all' ? null : Number(event.target.value) as FilterTimeframe,
            })}
          >
            {TIMEFRAMES.map((option) => (
              <option key={option.label} value={selectValue(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
