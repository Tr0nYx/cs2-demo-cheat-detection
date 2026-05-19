'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserProfile } from '@/components/UserProfile'
import { DemoHistoryTable } from '@/components/DemoHistoryTable'
import { QuickUploadCard } from '@/components/QuickUploadCard'
import { SteamMatchHistoryCard } from '@/components/SteamMatchHistoryCard'
import { FilterSidebar } from '@/components/Analytics/FilterSidebar'
import { SharecodeTab } from '@/components/DemoImport/SharecodeTab'
import { IngestionActionsPanel } from '@/components/Dashboard/IngestionActionsPanel'
import { PipelineStatusPanel } from '@/components/Dashboard/PipelineStatusPanel'
import { ScopedDemoList } from '@/components/Dashboard/ScopedDemoList'
import { ConsoleHeader, ConsolePage, ResearchSignalNotice, StatusBadge } from '@/components/Console'
import { useFilteredDemos } from '@/lib/hooks/useFilteredDemos'
import { useSteamMatchHistory } from '@/lib/hooks/useSteamMatchHistory'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  const matchHistory = useSteamMatchHistory()
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
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center bg-surface-base">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-trace-primary" />
          <p className="text-muted-foreground">Loading analysis console...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <ConsolePage width="wide">
      <ConsoleHeader
        title="Dashboard"
        metadata={
          <>
            <StatusBadge variant="tracking-active" label="Authenticated console" />
            <span>Current scope: {total} demos</span>
          </>
        }
        description="Monitor ingestion, tracking provenance, parser state, and review-ready demos from one task console."
        notice={<ResearchSignalNotice />}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.42fr)]">
        <UserProfile />
        <PipelineStatusPanel
          demos={demos}
          total={total}
          isLoading={filtersLoading || matchHistory.isLoading}
          error={filtersError}
          tracking={matchHistory.data ?? null}
        />
      </div>

      <IngestionActionsPanel
        upload={
          <QuickUploadCard
            onUploadSuccess={() => {
              setRefreshKey((key) => key + 1)
            }}
          />
        }
        sharecode={<SharecodeTab />}
        tracking={<SteamMatchHistoryCard />}
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <FilterSidebar
          filters={filters}
          onUpdateFilters={updateFilters}
          isLoading={filtersLoading}
          filterHistory={filterHistory}
        />

        <ScopedDemoList
          demos={demos}
          total={total}
          hasMore={hasMore}
          isLoading={filtersLoading}
          error={filtersError}
          onDemoSelect={(demoId) => router.push(`/results/${demoId}`)}
          onLoadMore={() => updateFilters({ offset: filters.offset + filters.limit })}
          loadMoreDisabled={filtersLoading}
        />
      </div>

      <DemoHistoryTable refreshKey={refreshKey} />
    </ConsolePage>
  )
}
