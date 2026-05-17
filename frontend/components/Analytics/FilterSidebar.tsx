'use client'

import type { FilterCriteria, FilterTimeframe, RatingBand, DemoOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

const MAPS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Vertigo', 'Dust2', 'Anubis']
const RATING_BANDS: Array<{ value: RatingBand | null; label: string }> = [
  { value: null, label: 'All ratings' },
  { value: '0-5', label: '0-5 RWS' },
  { value: '5-10', label: '5-10 RWS' },
  { value: '10+', label: '10+ RWS' },
]
const OUTCOMES: Array<{ value: DemoOutcome | null; label: string }> = [
  { value: null, label: 'All outcomes' },
  { value: 'win', label: 'Wins' },
  { value: 'loss', label: 'Losses' },
  { value: 'draw', label: 'Draws' },
]
const TIMEFRAMES: Array<{ value: FilterTimeframe | null; label: string }> = [
  { value: null, label: 'All-time' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

interface FilterSidebarProps {
  filters: FilterCriteria
  onUpdateFilters: (newFilters: Partial<FilterCriteria>) => void
  isLoading?: boolean
  filterHistory?: FilterCriteria[]
}

function optionClass(selected: boolean) {
  return [
    'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
    selected
      ? 'border-blue-500 bg-blue-500/15 text-blue-100'
      : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 hover:bg-gray-800',
  ].join(' ')
}

function describeFilters(filters: FilterCriteria) {
  const parts = [
    filters.map,
    filters.ratingBand ? `${filters.ratingBand} RWS` : null,
    filters.outcome,
    filters.daysBack ? `${filters.daysBack}d` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'All demos'
}

export function FilterSidebar({
  filters,
  onUpdateFilters,
  isLoading = false,
  filterHistory = [],
}: FilterSidebarProps) {
  const disabled = isLoading

  return (
    <aside className="w-full lg:w-[280px] lg:sticky lg:top-6 self-start" aria-label="Demo filters">
      <div className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Filters</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onUpdateFilters({ map: null, ratingBand: null, outcome: null, daysBack: null, offset: 0 })}
            aria-label="Clear filters"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        </div>

        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="mb-2 text-sm font-medium text-gray-200">Map</legend>
          <button type="button" className={optionClass(!filters.map)} onClick={() => onUpdateFilters({ map: null })}>
            All maps
          </button>
          <div className="grid grid-cols-2 gap-2">
            {MAPS.map((map) => (
              <button key={map} type="button" className={optionClass(filters.map === map)} onClick={() => onUpdateFilters({ map })}>
                {map}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6 space-y-2" disabled={disabled}>
          <legend className="mb-2 text-sm font-medium text-gray-200">Rating Band</legend>
          {RATING_BANDS.map((option) => (
            <label key={option.label} className="flex items-center gap-2 rounded-md border border-gray-800 px-3 py-2 text-sm text-gray-300">
              <input
                type="radio"
                name="ratingBand"
                checked={filters.ratingBand === option.value}
                onChange={() => onUpdateFilters({ ratingBand: option.value })}
                disabled={disabled}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="mt-6 space-y-2" disabled={disabled}>
          <legend className="mb-2 text-sm font-medium text-gray-200">Outcome</legend>
          {OUTCOMES.map((option) => (
            <label key={option.label} className="flex items-center gap-2 rounded-md border border-gray-800 px-3 py-2 text-sm text-gray-300">
              <input
                type="radio"
                name="outcome"
                checked={filters.outcome === option.value}
                onChange={() => onUpdateFilters({ outcome: option.value })}
                disabled={disabled}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="mt-6 space-y-2" disabled={disabled}>
          <legend className="mb-2 text-sm font-medium text-gray-200">Timeframe</legend>
          {TIMEFRAMES.map((option) => (
            <label key={option.label} className="flex items-center gap-2 rounded-md border border-gray-800 px-3 py-2 text-sm text-gray-300">
              <input
                type="radio"
                name="daysBack"
                checked={filters.daysBack === option.value}
                onChange={() => onUpdateFilters({ daysBack: option.value })}
                disabled={disabled}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {filterHistory.length > 0 && (
          <div className="mt-6 border-t border-gray-800 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent</h3>
            <div className="space-y-2">
              {filterHistory.slice(0, 3).map((item, index) => (
                <button
                  key={`${describeFilters(item)}-${index}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdateFilters(item)}
                  className="w-full rounded-md bg-gray-900 px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                >
                  {describeFilters(item)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
