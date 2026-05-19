'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchUserDemos } from '@/lib/api'
import { Demo } from '@/lib/types'
import { ConsolePanel, DataValue, StatusBadge, type StatusBadgeVariant } from '@/components/Console'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface SortState {
  sortBy: 'date' | 'suspicion'
  sortOrder: 'asc' | 'desc'
}

interface DemoHistoryTableProps {
  refreshKey?: number
}

export function DemoHistoryTable({ refreshKey = 0 }: DemoHistoryTableProps) {
  const router = useRouter()
  const [demos, setDemos] = useState<Demo[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  })
  const [sort, setSort] = useState<SortState>({ sortBy: 'date', sortOrder: 'desc' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDemos = async (page: number, sortBy: 'date' | 'suspicion', sortOrder: 'asc' | 'desc') => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetchUserDemos(page, 20, sortBy, sortOrder)
      setDemos(response.demos)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demos')
      setDemos([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Existing history API is loaded imperatively so refreshKey can force a page-one reload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDemos(1, sort.sortBy, sort.sortOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const handleSort = (column: 'date' | 'suspicion') => {
    const newSort: SortState =
      sort.sortBy === column && sort.sortOrder === 'desc'
        ? { sortBy: column, sortOrder: 'asc' }
        : { sortBy: column, sortOrder: 'desc' }

    setSort(newSort)
    loadDemos(1, newSort.sortBy, newSort.sortOrder)
  }

  const handlePrevious = () => {
    if (pagination.page > 1) {
      const newPage = pagination.page - 1
      setPagination({ ...pagination, page: newPage })
      loadDemos(newPage, sort.sortBy, sort.sortOrder)
    }
  }

  const handleNext = () => {
    if (pagination.hasMore) {
      const newPage = pagination.page + 1
      setPagination({ ...pagination, page: newPage })
      loadDemos(newPage, sort.sortBy, sort.sortOrder)
    }
  }

  const handleDemoClick = (demoId: string) => {
    router.push(`/results/${demoId}`)
  }

  return (
    <ConsolePanel
      title="Demo history"
      description="Secondary context for recent uploads, parser state, and review signal summaries."
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-trace-primary" />
            <span className="ml-2 text-muted-foreground">Loading demo history...</span>
          </div>
        ) : demos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-raised py-8 text-center">
            <p className="text-foreground">No demos uploaded yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Upload or import a demo to start post-game analysis.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Demo File</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Map</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      <SortButton active={sort.sortBy === 'date'} order={sort.sortOrder} onClick={() => handleSort('date')}>
                        Upload Date
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      <SortButton active={sort.sortBy === 'suspicion'} order={sort.sortOrder} onClick={() => handleSort('suspicion')} align="right">
                        Review signal
                      </SortButton>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {demos.map((demo) => {
                    const suspicionScore = getSuspicionScore(demo)
                    return (
                      <tr
                        key={demo.id}
                        onClick={() => handleDemoClick(demo.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handleDemoClick(demo.id)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer border-b border-border-subtle transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-trace-primary"
                      >
                        <td className="max-w-xs truncate px-4 py-3 text-foreground">
                          <DataValue truncate>{demo.original_filename || demo.file_path?.split(/[\\/]/).pop() || demo.id}</DataValue>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{demo.map || 'Unknown'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={statusVariant(demo.status)} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(demo.created_at)}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {demo.status === 'done' ? (
                            <StatusBadge variant={suspicionVariant(suspicionScore)} label={formatSuspicionScore(suspicionScore)} />
                          ) : (
                            <StatusBadge variant="trace-unavailable" label="Pending" />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {demos.map((demo) => {
                const suspicionScore = getSuspicionScore(demo)
                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleDemoClick(demo.id)}
                    className="w-full cursor-pointer rounded-lg border border-border-subtle bg-surface-raised p-4 text-left transition-colors hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <DataValue truncate>{demo.original_filename || demo.file_path?.split(/[\\/]/).pop() || demo.id}</DataValue>
                        <p className="mt-2 text-sm text-muted-foreground">{formatDate(demo.created_at)}</p>
                      </div>
                      <StatusBadge variant={statusVariant(demo.status)} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Map: {demo.map || 'Unknown'}</span>
                      {demo.status === 'done' ? (
                        <StatusBadge variant={suspicionVariant(suspicionScore)} label={formatSuspicionScore(suspicionScore)} />
                      ) : (
                        <StatusBadge variant="trace-unavailable" label="Pending" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1 rounded border border-border-subtle bg-surface-raised px-3 py-2 text-foreground transition-colors hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="text-center text-sm text-muted-foreground">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)} ({pagination.total} total)
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!pagination.hasMore}
                  className="flex items-center gap-1 rounded border border-border-subtle bg-surface-raised px-3 py-2 text-foreground transition-colors hover:bg-surface-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ConsolePanel>
  )
}

function getSuspicionScore(demo: Demo): number {
  return demo.results?.overall_score ?? 0
}

function suspicionVariant(score: number): StatusBadgeVariant {
  const normalized = score > 1 ? score / 100 : score
  if (normalized < 0.33) return 'suspicion-clean'
  if (normalized < 0.67) return 'suspicion-review'
  return 'suspicion-high'
}

function statusVariant(status: Demo['status']): StatusBadgeVariant {
  if (status === 'done') return 'demo-done'
  if (status === 'error') return 'demo-error'
  return 'demo-pending'
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return 'Invalid date'
  }
}

function formatSuspicionScore(score: number): string {
  const normalized = score > 1 ? score : score * 100
  return normalized.toFixed(0) + '%'
}

function SortButton({
  active,
  order,
  onClick,
  children,
  align = 'left',
}: {
  active: boolean
  order: SortState['sortOrder']
  onClick: () => void
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const Icon = order === 'desc' ? ArrowDown : ArrowUp

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary ${
        align === 'right' ? 'justify-end' : ''
      }`}
    >
      <span>{children}</span>
      {active && <Icon className="size-3.5" aria-hidden />}
    </button>
  )
}
