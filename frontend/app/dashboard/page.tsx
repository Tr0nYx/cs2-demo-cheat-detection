'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserProfile } from '@/components/UserProfile'
import { DemoHistoryTable } from '@/components/DemoHistoryTable'
import { QuickUploadCard } from '@/components/QuickUploadCard'
import { FilterSidebar } from '@/components/Analytics/FilterSidebar'
import { useFilteredDemos } from '@/lib/hooks/useFilteredDemos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const {
    filters,
    updateFilters,
    demos,
    total,
    hasMore,
    isLoading: filtersLoading,
    error: filtersError,
    filterHistory,
  } = useFilteredDemos()

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true)
    } else if (status === 'unauthenticated') {
      router.push('/')
    } else {
      setIsLoading(false)
    }
  }, [status, router])

  if (isLoading || status === 'loading') {
    return (
      <div className="flex-1 w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="flex-1 w-full">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Manage your demos and view your analysis history.</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <FilterSidebar
            filters={filters}
            onUpdateFilters={updateFilters}
            isLoading={filtersLoading}
            filterHistory={filterHistory}
          />

          <div className="min-w-0 flex-1 space-y-8">
            <UserProfile />
            <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Filtered Demo Scope</h2>
                  <p className="text-sm text-gray-400">{total} demos match the current analysis scope.</p>
                </div>
                {filtersLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating
                  </div>
                )}
              </div>

              {filtersError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{filtersError}</AlertDescription>
                </Alert>
              )}

              {filtersLoading && demos.length === 0 ? (
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-md bg-gray-900" />
                  ))}
                </div>
              ) : demos.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-700 px-4 py-10 text-center">
                  <p className="text-gray-300">No demos match your filters.</p>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting the filters above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {demos.map((demo) => (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => router.push(`/results/${demo.id}`)}
                      className="grid w-full gap-3 rounded-md border border-gray-800 bg-gray-900/70 p-4 text-left transition-colors hover:border-gray-600 hover:bg-gray-900 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
                    >
                      <div>
                        <div className="font-mono text-sm text-white">{demo.id}</div>
                        <div className="mt-1 text-xs text-gray-500">{new Date(demo.uploadedAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-gray-500">Map</div>
                        <div className="text-sm text-gray-200">{demo.map ?? 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-gray-500">TRACE</div>
                        <div className="text-sm text-gray-200">
                          {demo.traceAdjusted === null ? 'Pending' : demo.traceAdjusted.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        {demo.outcome && (
                          <span className="rounded bg-gray-800 px-2 py-1 text-xs uppercase text-gray-300">{demo.outcome}</span>
                        )}
                        <span className="rounded bg-blue-500/15 px-2 py-1 text-xs uppercase text-blue-100">{demo.status}</span>
                      </div>
                    </button>
                  ))}

                  {hasMore && (
                    <div className="pt-2 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateFilters({ offset: filters.offset + filters.limit })}
                        disabled={filtersLoading}
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <DemoHistoryTable refreshKey={refreshKey} />
          </div>

          <div className="lg:w-[280px] space-y-8">
            <QuickUploadCard
              onUploadSuccess={() => {
                setRefreshKey((k) => k + 1)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
