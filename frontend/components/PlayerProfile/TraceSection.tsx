'use client'

import { Activity, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getComponentContextLabel, getTraceContextLabel } from '@/lib/research-context'
import type { TraceHistoryCollectionDto } from '@/lib/types'

const componentLabels: Record<string, string> = {
  ekill: 'eKILL',
  aim: 'AIM',
  kast: 'KAST',
  util: 'UTIL',
  clutch: 'CLUTCH',
}

export function TraceSection({ traceHistory }: { traceHistory: TraceHistoryCollectionDto | null }) {
  const latest = traceHistory?.traces?.[0]
  const components = latest?.components
  const percentile = latest?.traceAdjustedPercentile

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" aria-hidden="true" />
          TRACE score and components
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">{getTraceContextLabel(percentile)}</p>
      </CardHeader>
      <CardContent>
        {!latest ? (
          <p className="text-sm text-gray-500">No TRACE data is available for this player yet.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Latest TRACE</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold text-gray-950 dark:text-white">
                  {latest.traceAdjusted.toFixed(2)}
                </span>
                {typeof percentile === 'number' && (
                  <span className="pb-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    P{Math.round(percentile)}
                  </span>
                )}
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                {traceHistory?.pagination.total ?? 0} TRACE samples
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {components && Object.entries(components).map(([key, value]) => (
                <div key={key} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {componentLabels[key] || key}
                      </p>
                      <p className="text-xs text-gray-500">{getComponentContextLabel(componentLabels[key] || key)}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold">{value.toFixed(2)}</span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, value * 50))} className="mt-3 h-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
