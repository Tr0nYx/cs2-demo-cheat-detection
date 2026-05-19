'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDemoHistoryContextLabel } from '@/lib/research-context'
import type { PlayerHistoryResponse } from '@/lib/hooks/usePlayerProfile'

function formatDate(value?: string) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

export function DemoHistorySection({
  playerId,
  history,
  compact = true,
}: {
  playerId: string
  history: PlayerHistoryResponse | null
  compact?: boolean
}) {
  const rows = compact ? (history?.results ?? []).slice(0, 10) : (history?.results ?? [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Demo history</CardTitle>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{getDemoHistoryContextLabel()}</p>
        </div>
        {compact && (
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`/players/${playerId}/demos`}>
            View all demos
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No analyzed demos are available for this player.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="py-2 pr-4 font-medium">Demo</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Map</th>
                  <th className="px-4 py-2 font-medium">Outcome</th>
                  <th className="px-4 py-2 font-medium">TRACE signal</th>
                  <th className="py-2 pl-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                {rows.map((row) => (
                  <tr key={row.result_id} className="text-gray-700 dark:text-gray-300">
                    <td className="max-w-[180px] truncate py-3 pr-4 font-mono text-xs">{row.demo_id}</td>
                    <td className="px-4 py-3">{formatDate(row.demo?.uploaded_at || row.analyzed_at)}</td>
                    <td className="px-4 py-3">{row.demo?.map || 'Unknown'}</td>
                    <td className="px-4 py-3 capitalize">{row.demo?.outcome || 'n/a'}</td>
                    <td className="px-4 py-3 font-semibold">{row.scores.overall}</td>
                    <td className="py-3 pl-4">
                      <Link
                        href={`/matches/${row.demo_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-950 underline-offset-4 hover:underline dark:text-white"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
