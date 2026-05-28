'use client'

import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataValue, StatusBadge } from '@/components/Console'
import { filterResultRows } from '@/lib/result-dashboard'
import { cn } from '@/lib/utils'
import type { ResultFeatureFamilyBand, ResultPlayerRowViewModel, ResultReviewFilter } from '@/lib/types'

type PlayerEvidenceTableProps = {
  rows: ResultPlayerRowViewModel[]
  aggregateRows?: ResultPlayerRowViewModel[]
  selectedSteamId: string | null
  onSelect: (row: ResultPlayerRowViewModel) => void
}

const filters: Array<{ id: ResultReviewFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'review', label: 'Review signals' },
  { id: 'limited', label: 'Capped/limited' },
  { id: 'aggregate', label: 'Aggregate' },
]

function statusVariant(label: string) {
  if (label === 'High review signal') return 'suspicion-high'
  if (label === 'Review signal') return 'suspicion-review'
  return 'suspicion-clean'
}

function markerLabel(marker: ResultFeatureFamilyBand['marker'], state: ResultFeatureFamilyBand['evidenceState']) {
  if (marker === 'capped') return 'Capped'
  if (marker === 'limited') return 'Limited'
  if (marker === 'unavailable' || state === 'unavailable') return 'Unavailable'
  return 'Stored'
}

function FeatureBands({ row, compact = false }: { row: ResultPlayerRowViewModel; compact?: boolean }) {
  const visibleBands = compact ? row.featureFamilyBands.slice(0, 4) : row.featureFamilyBands
  const hiddenCount = row.featureFamilyBands.length - visibleBands.length

  if (visibleBands.length === 0) {
    return <span className="text-xs text-muted-foreground">Feature evidence unavailable</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleBands.map((band) => (
        <span
          key={band.name}
          className="min-w-[7.5rem] rounded border border-border-subtle bg-surface-raised px-2 py-1 text-xs text-muted-foreground"
          title={`${band.label}: ${band.bandLabel}. ${band.topDriver ?? 'No top driver stored.'}`}
        >
          <span className="block font-medium text-foreground">{band.label}</span>
          <span className="font-data">{Math.round(band.score)}</span>
          <span className="mx-1">/</span>
          <span>{markerLabel(band.marker, band.evidenceState)}</span>
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded border border-border-subtle bg-surface-raised px-2 py-1 text-xs text-muted-foreground">
          +{hiddenCount} more
        </span>
      )}
    </div>
  )
}

export function PlayerEvidenceTable({ rows, aggregateRows = [], selectedSteamId, onSelect }: PlayerEvidenceTableProps) {
  const [activeFilter, setActiveFilter] = useState<ResultReviewFilter>('all')
  const visibleRows = useMemo(() => (
    activeFilter === 'aggregate'
      ? filterResultRows(aggregateRows, activeFilter)
      : filterResultRows(rows, activeFilter)
  ), [activeFilter, aggregateRows, rows])

  if (rows.length === 0 && aggregateRows.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-panel p-4 text-sm text-muted-foreground">
        No player-level rows are available for this analysis.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Player review filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              'h-8 rounded-lg border border-border-subtle px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary',
              activeFilter === filter.id && 'border-trace-primary bg-provenance-bg text-foreground'
            )}
            aria-pressed={activeFilter === filter.id}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visibleRows.length === 0 && (
        <div className="rounded-lg border border-border-subtle bg-surface-panel p-4 text-sm text-muted-foreground">
          No rows match the current review filter. The underlying analysis payload has not changed.
        </div>
      )}

      <div className="hidden overflow-hidden rounded-lg border border-border-subtle bg-surface-panel md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-raised hover:bg-surface-raised">
              <TableHead>Player</TableHead>
              <TableHead>Review signal</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Feature-family bands</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={row.steamId}
                data-state={selectedSteamId === row.steamId ? 'selected' : undefined}
                className="cursor-pointer border-border-subtle hover:bg-surface-raised"
                onClick={() => onSelect(row)}
              >
                <TableCell className="whitespace-normal">
                  <div className="font-medium text-foreground">{row.name}</div>
                  <DataValue className="mt-1 text-xs">{row.steamId}</DataValue>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={statusVariant(row.statusLabel)} label={row.statusLabel} />
                    <span className="font-data font-semibold">{row.scoreLabel}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="text-sm text-foreground">{row.confidenceLabel}</div>
                  <div className="text-xs text-muted-foreground">{row.evidenceStrengthLabel}</div>
                  {row.contextReducers.length > 0 && (
                    <div className="mt-1 text-xs text-signal-review">
                      {row.contextReducers.length} context reducer{row.contextReducers.length === 1 ? '' : 's'}
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <FeatureBands row={row} />
                </TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  {row.profileHref ? (
                    <a
                      href={row.profileHref}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Profile
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No profile link</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleRows.map((row) => (
          <button
            key={row.steamId}
            type="button"
            onClick={() => onSelect(row)}
            className={cn(
              'rounded-lg border border-border-subtle bg-surface-panel p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary',
              selectedSteamId === row.steamId && 'border-trace-primary bg-provenance-bg/50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-foreground">{row.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{row.steamId}</div>
              </div>
              <span className="font-data text-sm font-semibold">{row.scoreLabel}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge variant={statusVariant(row.statusLabel)} label={row.statusLabel} />
              <span className="rounded border border-border-subtle bg-surface-raised px-2 py-1 text-xs text-muted-foreground">
                {row.confidenceLabel}
              </span>
            </div>
            <div className="mt-3">
              <FeatureBands row={row} compact />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
