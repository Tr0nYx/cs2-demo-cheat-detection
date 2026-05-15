'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { VerdictBadge } from './VerdictBadge'
import { FeatureTable } from './FeatureTable'
import { Demo, Player } from '@/lib/types'
import { AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadDemoUrl } from '@/lib/api'

interface ResultsCardProps {
  demo: Demo
  onDownload?: (demoId: string) => void
}

export function ResultsCard({ demo, onDownload }: ResultsCardProps) {
  // Handle pending state
  if (demo.status === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis in Progress</CardTitle>
          <CardDescription>Demo: {demo.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="animate-spin">⟳</div>
            <div>
              <p className="font-medium">Analysis running...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This usually takes 10-30 seconds.
              </p>
            </div>
          </div>
          <Skeleton className="h-20" />
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    )
  }

  // Handle error state
  if (demo.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Analysis Failed</AlertTitle>
        <AlertDescription>
          {demo.error_message || 'An unknown error occurred during analysis.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Handle done state
  if (demo.status === 'done' && demo.results) {
    const players = demo.results.players || []
    const overallScore = demo.results.overall_score ?? 0
    const overallVerdict = demo.results.overall_verdict ?? 'unknown'

    return (
      <div className="space-y-6">
        {/* Overall Results */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Demo {demo.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Suspicion Level</p>
              <VerdictBadge score={overallScore} size="lg" />
            </div>

            {/* Download button */}
            <a
              href={downloadDemoUrl(demo.id)}
              download
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Demo
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Per-player results */}
        {players.map((player: Player) => (
          <Card key={player.steamId}>
            <CardHeader>
              <CardTitle>{player.name || 'Unknown Player'}</CardTitle>
              <CardDescription>
                Steam ID: {player.steamId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Verdict */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <VerdictBadge score={player.overallScore} size="md" />
              </div>

              {/* Features table */}
              {player.features && player.features.length > 0 ? (
                <div className="rounded-lg border">
                  <FeatureTable features={player.features} />
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No feature data available for this player.
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {players.length === 0 && (
          <Alert>
            <AlertTitle>No Players Found</AlertTitle>
            <AlertDescription>
              No player data was extracted from this demo.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <Alert>
      <AlertTitle>Unknown Status</AlertTitle>
      <AlertDescription>
        The demo status is unknown. Please try again later.
      </AlertDescription>
    </Alert>
  )
}
