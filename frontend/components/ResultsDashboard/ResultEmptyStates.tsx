'use client'

import { AlertCircle, Loader2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { ResultDashboardViewModel } from '@/lib/types'

type ResultEmptyStatesProps = {
  model: ResultDashboardViewModel
}

export function ResultEmptyState({ model }: ResultEmptyStatesProps) {
  if (model.emptyState === 'pending') {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-panel p-4">
        <div className="mb-4 flex items-center gap-2 font-medium">
          <Loader2 className="size-4 animate-spin text-trace-primary" aria-hidden />
          <span>Analysis in progress</span>
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-7 w-full bg-surface-raised" />
          <Skeleton className="h-24 w-full bg-surface-raised" />
        </div>
      </div>
    )
  }

  if (!model.emptyState) return null

  const titleByState: Record<NonNullable<ResultDashboardViewModel['emptyState']>, string> = {
    pending: 'Analysis in progress',
    error: 'Analysis failed',
    no_results: 'No result payload',
    no_players: 'No player rows found',
    aggregate_only: 'Demo-level aggregate only',
    unknown: 'Unknown status',
  }

  return (
    <Alert className="border-border-subtle bg-surface-panel">
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>{titleByState[model.emptyState]}</AlertTitle>
      <AlertDescription>{model.message}</AlertDescription>
    </Alert>
  )
}
