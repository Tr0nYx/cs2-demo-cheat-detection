'use client'

import { Download, Eye, FileSearch } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConsolePanel, DataValue, StatusBadge } from '@/components/Console'
import { downloadDemoUrl } from '@/lib/api'
import type { Demo, ResultDashboardViewModel } from '@/lib/types'

type ResultOverviewPanelProps = {
  demo: Demo
  model: ResultDashboardViewModel
}

function statusVariant(status: ResultDashboardViewModel['status']) {
  if (status === 'pending') return 'demo-pending'
  if (status === 'done') return 'demo-done'
  if (status === 'error') return 'demo-error'
  return 'neutral'
}

function signalVariant(verdict: ResultDashboardViewModel['overallVerdict']) {
  if (verdict === 'likely_cheating') return 'suspicion-high'
  if (verdict === 'suspicious') return 'suspicion-review'
  return 'suspicion-clean'
}

export function ResultOverviewPanel({ demo, model }: ResultOverviewPanelProps) {
  const scoreText = model.overallScore === null ? 'Unavailable' : `${Math.round(model.overallScore)}/100`
  const coverageItems = [
    ['Real players', model.coverageCounts.realPlayers],
    ['Aggregate entries', model.coverageCounts.aggregateEntries],
    ['Review signals', model.coverageCounts.reviewSignals],
    ['Capped or limited', model.coverageCounts.limitedFeatures],
    ['Unavailable evidence', model.coverageCounts.unavailableEvidence],
    ['Stored samples', model.coverageCounts.evidenceSamples],
  ] as const

  return (
    <ConsolePanel
      title="Review Orientation"
      description="Stored post-game evidence coverage for human research review, not proof or enforcement."
      action={
        <div className="flex flex-wrap gap-2">
          <a
            href={`/matches/${demo.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
          >
            <FileSearch className="size-4" aria-hidden />
            Match report
          </a>
          <a
            href="#viewer-panel"
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary"
          >
            <Eye className="size-4" aria-hidden />
            Viewer
          </a>
          {demo.status === 'done' && (
            <a href={downloadDemoUrl(demo.id)} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="size-4" aria-hidden />
                Download
              </Button>
            </a>
          )}
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_0.95fr_1.15fr]">
        <div className="rounded-lg border border-border-subtle bg-surface-raised p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Analysis state</div>
          <StatusBadge variant={statusVariant(model.status)} label={model.statusLabel} />
          <p className="mt-3 text-sm leading-5 text-muted-foreground">{model.message}</p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-raised p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Overall research signal</div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={signalVariant(model.overallVerdict)} label={model.overallStatusLabel} />
            <span className="font-data text-lg font-semibold text-foreground">{scoreText}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Overall scores summarize stored analysis output and stay in human review context.
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-raised p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Provenance</div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Demo</span>
              <DataValue truncate className="max-w-[13rem]">{demo.id}</DataValue>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Map</span>
              <DataValue>{demo.map || 'Unavailable'}</DataValue>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Model</span>
              <DataValue>{model.modelVersion || 'Unavailable'}</DataValue>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border-subtle bg-surface-raised p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Stored evidence coverage</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {coverageItems.map(([label, value]) => (
            <div key={label} className="rounded border border-border-subtle bg-surface-panel px-3 py-2">
              <div className="font-data text-lg font-semibold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </ConsolePanel>
  )
}
