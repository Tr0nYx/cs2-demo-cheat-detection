'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ExternalLink, Info, ListFilter } from 'lucide-react'

import { ConsolePanel, DataValue, StatusBadge } from '@/components/Console'
import type { Feature, ResultContextReducer, ResultEvidenceSample, ResultPlayerRowViewModel } from '@/lib/types'

type PlayerEvidenceDetailProps = {
  row: ResultPlayerRowViewModel | null
  demoId?: string
}

function statusVariant(label: string) {
  if (label === 'High review signal') return 'suspicion-high'
  if (label === 'Review signal') return 'suspicion-review'
  return 'suspicion-clean'
}

function reducerTone(reducer: ResultContextReducer): string {
  if (reducer.severity === 'critical') return 'border-signal-high/30 bg-signal-high-bg text-signal-high'
  if (reducer.severity === 'warning') return 'border-signal-review/30 bg-signal-review-bg text-signal-review'
  return 'border-border-subtle bg-surface-raised text-muted-foreground'
}

function sampleFacet(label: string, value: string | number | undefined) {
  return (
    <span className="rounded border border-border-subtle bg-background px-2 py-1 text-xs text-muted-foreground">
      {label}: {value ?? 'Unavailable'}
    </span>
  )
}

function EvidenceSamples({ samples }: { samples: ResultEvidenceSample[] }) {
  const families = Array.from(new Set(samples.map((sample) => sample.featureFamily)))
  const [activeFamily, setActiveFamily] = useState<Feature['name'] | 'all'>('all')
  const visibleSamples = activeFamily === 'all'
    ? samples
    : samples.filter((sample) => sample.featureFamily === activeFamily)

  if (samples.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-3 text-sm text-muted-foreground">
        No stored evidence samples are available for this row. Round, target, weapon, and shot-string facets are unavailable.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Evidence sample filters">
        <button
          type="button"
          onClick={() => setActiveFamily('all')}
          aria-pressed={activeFamily === 'all'}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-subtle px-3 text-sm font-medium text-muted-foreground hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary aria-pressed:border-trace-primary aria-pressed:bg-provenance-bg aria-pressed:text-foreground"
        >
          <ListFilter className="size-3.5" aria-hidden />
          All samples
        </button>
        {families.map((family) => (
          <button
            key={family}
            type="button"
            onClick={() => setActiveFamily(family)}
            aria-pressed={activeFamily === family}
            className="h-8 rounded-lg border border-border-subtle px-3 text-sm font-medium text-muted-foreground hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary aria-pressed:border-trace-primary aria-pressed:bg-provenance-bg aria-pressed:text-foreground"
          >
            {family}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {visibleSamples.map((sample) => (
          <article key={`${sample.featureFamily}-${sample.label}-${sample.text}`} className="rounded-lg border border-border-subtle bg-surface-raised p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-heading text-sm font-semibold text-foreground">{sample.label}</h4>
              <span className="text-xs text-muted-foreground">
                Strength: {sample.evidenceStrength}; confidence: {sample.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">{sample.text}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sampleFacet('Round', sample.round)}
              {sampleFacet('Target', sample.target)}
              {sampleFacet('Weapon', sample.weapon)}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function PlayerEvidenceDetail({ row, demoId }: PlayerEvidenceDetailProps) {
  const strongestBands = useMemo(() => (
    row ? [...row.featureFamilyBands].sort((a, b) => b.score - a.score).slice(0, 3) : []
  ), [row])

  if (!row) {
    return (
      <ConsolePanel title="Evidence Detail" description="Select a player row to inspect feature evidence.">
        <p className="text-sm text-muted-foreground">No player selected.</p>
      </ConsolePanel>
    )
  }

  return (
    <ConsolePanel
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.name}</span>
          <DataValue>{row.kind === 'demo_aggregate' ? 'No player attribution' : row.steamId}</DataValue>
        </div>
      }
      description={row.kind === 'demo_aggregate'
        ? 'Demo-level aggregate research signal, separated from real player attribution.'
        : 'Narrative review for the selected player row.'}
      action={
        <div className="flex items-center gap-2">
          <StatusBadge variant={statusVariant(row.statusLabel)} label={row.statusLabel} />
          <span className="font-data text-base font-semibold">{row.scoreLabel}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {row.hasWarnings && (
          <div className="flex gap-2 rounded-lg border border-signal-review/30 bg-signal-review-bg px-3 py-2 text-sm text-signal-review">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Some feature evidence is capped, limited, or unavailable. Keep this in human review context.</span>
          </div>
        )}

        <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">What happened</h3>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {row.kind === 'demo_aggregate'
              ? 'The stored payload contains a demo-level aggregate entry. It is separated from real player attribution.'
              : `${row.name} has a ${row.statusLabel.toLowerCase()} with ${row.featureFamilyBands.length} stored feature families and ${row.evidenceSamples.length} evidence sample snippets.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {strongestBands.map((band) => (
              <span key={band.name} className="rounded border border-border-subtle bg-surface-panel px-2 py-1 text-xs text-muted-foreground">
                {band.label}: {Math.round(band.score)} ({band.bandLabel})
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">Why this score</h3>
          <div className="mt-3 grid gap-3">
            {row.features.map((item) => (
              <article key={item.feature.name} className="rounded border border-border-subtle bg-surface-panel p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground">{item.label}</h4>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.explanation.summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-data text-lg font-semibold text-foreground">{Math.round(item.score)}</div>
                    <div className="text-xs text-muted-foreground">{item.bandLabel}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Signal drivers</div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {item.explanation.drivers.slice(0, 5).map((driver) => (
                        <li key={driver}>- {driver}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Limitations</div>
                    {item.explanation.limitations.length > 0 ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {item.explanation.limitations.map((limitation) => (
                          <li key={limitation}>- {limitation}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No extra limitation was stored for this feature.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">What limits confidence</h3>
          {row.contextReducers.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {row.contextReducers.map((reducer) => (
                <div key={`${reducer.kind}-${reducer.sourceFeature ?? 'row'}-${reducer.description}`} className={`rounded border px-3 py-2 text-sm ${reducerTone(reducer)}`}>
                  <div className="font-semibold">{reducer.label}</div>
                  <p className="mt-1 leading-5">{reducer.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No confidence-limiting context was stored for this row.</p>
          )}
        </section>

        <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">Evidence samples</h3>
          <div className="mt-3">
            <EvidenceSamples samples={row.evidenceSamples} />
          </div>
        </section>

        <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">Next review links</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {row.profileHref && (
              <a href={row.profileHref} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary">
                <ExternalLink className="size-3.5" aria-hidden />
                Player profile
              </a>
            )}
            {demoId && (
              <a href={`/matches/${demoId}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary">
                Match report
              </a>
            )}
            <a href="#trace-panel" className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary">
              TRACE tab
            </a>
            <a href="#viewer-panel" className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace-primary">
              Viewer tab
            </a>
          </div>
        </section>

        <details className="rounded-lg border border-border-subtle bg-surface-panel px-3 py-2">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <Info className="size-4" aria-hidden />
            Technical provenance
          </summary>
          <div className="mt-2 grid gap-2">
            {row.features.map((item) => (
              <div key={item.feature.name} className="rounded border border-border-subtle bg-background px-3 py-2">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                {item.explanation.technicalDetails.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    {item.explanation.technicalDetails.map((detail) => (
                      <li key={detail} className="rounded border border-border-subtle bg-surface-panel px-2 py-1">
                        {detail}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No technical measurements were stored.</p>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>
    </ConsolePanel>
  )
}
