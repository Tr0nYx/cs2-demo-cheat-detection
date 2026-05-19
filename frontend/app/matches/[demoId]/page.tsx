'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Loader2, RotateCw } from 'lucide-react'

import {
  ConsoleHeader,
  ConsolePage,
  ConsolePanel,
  ResearchSignalNotice,
  StatusBadge,
} from '@/components/Console'
import {
  MatchEventsSection,
  MatchHeader,
  MatchParticipantTable,
  MatchRoundsSection,
  MatchSectionTabs,
  MatchViewerSection,
} from '@/components/MatchDetail'
import { ResearchDisclaimerBanner } from '@/components/ResearchDisclaimerBanner'
import { Button } from '@/components/ui/button'
import { downloadDemoUrl } from '@/lib/api'
import { useMatchDetail } from '@/lib/hooks/useMatchDetail'

export default function MatchDetailPage() {
  const params = useParams<{ demoId: string }>()
  const demoId = params.demoId
  const { data, demo, errors, hasPartialError, isError, isLoading, refetch } = useMatchDetail(demoId)

  if (isLoading && !data) {
    return (
      <ConsolePage width="wide">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-trace-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading match report...</p>
        </div>
      </ConsolePage>
    )
  }

  if (isError && !data) {
    return (
      <ConsolePage width="wide">
        <ResearchDisclaimerBanner />
        <ConsoleHeader
          title="Match report unavailable"
          description={errors.detail?.message ?? errors.demo?.message ?? 'The match report could not be loaded.'}
          action={
            <Button type="button" variant="outline" onClick={() => refetch()}>
              <RotateCw className="mr-2 size-4" aria-hidden />
              Retry
            </Button>
          }
        />
      </ConsolePage>
    )
  }

  if (!data) {
    return (
      <ConsolePage width="wide">
        <ResearchDisclaimerBanner />
        <ConsoleHeader
          title="Match report not found"
          description="No match detail payload is available for this demo ID."
          action={<BackLinks demoId={demoId} />}
        />
      </ConsolePage>
    )
  }

  const analyzed = demo?.status === 'done' || data.summary.status === 'done'

  return (
    <ConsolePage width="wide">
      <ResearchDisclaimerBanner />
      <Link
        href="/history"
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trace-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to history
      </Link>

      <ConsoleHeader
        title="Match detail"
        description="A post-game match report for reviewing metadata, participants, rounds, events, and viewer context."
        metadata={
          <>
            <StatusBadge variant={analyzed ? 'demo-done' : data.summary.status === 'error' ? 'demo-error' : 'demo-pending'} />
            <span>Demo ID: {demoId}</span>
            {data.summary.map && <span>Map: {data.summary.map}</span>}
          </>
        }
        action={<BackLinks demoId={demoId} />}
        notice={<ResearchSignalNotice />}
      />

      {hasPartialError && (
        <ConsolePanel title="Partial data notice">
          <p className="text-sm leading-6 text-muted-foreground">
            Some round or event sections could not load. Available overview data remains visible.
          </p>
        </ConsolePanel>
      )}

      <MatchSectionTabs />

      <section id="overview" className="scroll-mt-32 space-y-6">
        <MatchHeader
          summary={data.summary}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href={`/results/${demoId}`}>
                <Button variant="outline" size="sm">Analysis results</Button>
              </Link>
              {analyzed && (
                <a href={downloadDemoUrl(demoId)} target="_blank" rel="noreferrer" download>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 size-4" aria-hidden />
                    Download demo
                  </Button>
                </a>
              )}
            </div>
          }
        />
        <ConsolePanel
          title="Participants"
          description="Player-level rows show available match context and neutral research-signal scores."
        >
          <MatchParticipantTable participants={data.participants} />
        </ConsolePanel>
      </section>

      <section id="rounds" className="scroll-mt-32">
        <MatchRoundsSection rounds={data.rounds} />
      </section>

      <section id="events" className="scroll-mt-32">
        <MatchEventsSection events={data.events} flaggedKills={data.flaggedKills} />
      </section>

      <section id="viewer" className="scroll-mt-32">
        <MatchViewerSection demoId={demoId} mapName={data.summary.map} analyzed={analyzed} />
      </section>
    </ConsolePage>
  )
}

function BackLinks({ demoId }: { demoId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/results/${demoId}`}>
        <Button variant="outline" size="sm">Open analysis</Button>
      </Link>
      <Link href="/history">
        <Button variant="outline" size="sm">History</Button>
      </Link>
    </div>
  )
}
