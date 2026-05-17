'use client'

import { TrendChart } from '@/components/Analytics/TrendChart'
import { useAllTrends } from '@/lib/hooks/useAnalyticsTrends'

export default function AnalyticsTrendsPage() {
  const trends = useAllTrends()

  return (
    <main className="min-h-screen bg-white px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Analytics Trends</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <TrendChart metric="consistency" data={trends.consistency.data} isLoading={trends.consistency.isLoading} error={trends.consistency.error as Error | null} />
          <TrendChart metric="arc" data={trends.arc.data} isLoading={trends.arc.isLoading} error={trends.arc.error as Error | null} />
          <TrendChart metric="weapons" data={trends.weapons.data} isLoading={trends.weapons.isLoading} error={trends.weapons.error as Error | null} />
        </div>
      </div>
    </main>
  )
}
