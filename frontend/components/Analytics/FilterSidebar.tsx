'use client'

import type { FilterCriteria, FilterTimeframe, RatingBand, DemoOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { DataValue } from '@/components/Console'
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
    'w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary disabled:cursor-not-allowed disabled:opacity-50',
    selected
      ? 'border-trace-primary/60 bg-provenance-bg text-trace-primary'
      : 'border-border-subtle bg-surface-raised text-foreground hover:border-border-strong hover:bg-surface-panel',
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
    <aside className="w-full self-start lg:sticky lg:top-6" aria-label="Demo filters">
      <div className="rounded-lg border border-border-subtle bg-surface-panel p-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Analysis scope</h2>
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
          <legend className="mb-2 text-sm font-medium text-foreground">Map</legend>
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
          <legend className="mb-2 text-sm font-medium text-foreground">Rating Band</legend>
          {RATING_BANDS.map((option) => (
            <label key={option.label} className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground transition focus-within:ring-2 focus-within:ring-trace-primary has-disabled:opacity-50">
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
          <legend className="mb-2 text-sm font-medium text-foreground">Outcome</legend>
          {OUTCOMES.map((option) => (
            <label key={option.label} className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground transition focus-within:ring-2 focus-within:ring-trace-primary has-disabled:opacity-50">
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
          <legend className="mb-2 text-sm font-medium text-foreground">Timeframe</legend>
          {TIMEFRAMES.map((option) => (
            <label key={option.label} className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground transition focus-within:ring-2 focus-within:ring-trace-primary has-disabled:opacity-50">
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
          <div className="mt-6 border-t border-border-subtle pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Recent</h3>
            <div className="space-y-2">
              {filterHistory.slice(0, 3).map((item, index) => (
                <button
                  key={`${describeFilters(item)}-${index}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdateFilters(item)}
                  className="w-full cursor-pointer rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-left text-xs text-foreground hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DataValue truncate>{describeFilters(item)}</DataValue>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
