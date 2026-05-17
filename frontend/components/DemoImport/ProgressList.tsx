'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useImportHistory } from '@/lib/hooks/useImportHistory'

interface ProgressItem {
  id: string
  sharecode: string
  platform: string
  status: 'pending' | 'downloading' | 'parsing' | 'complete' | 'failed'
  demo_id?: string
  error_message?: string
  imported_at: string
}

export function ProgressList({ sharecodes }: { sharecodes: string[] }) {
  const { data: history, isLoading } = useImportHistory()

  // Map requested sharecodes to import records
  const imports = useMemo(() => {
    if (!history) return []

    // Sort by imported_at descending, take only requested sharecodes
    return history.imports
      .filter(imp => sharecodes.some(sc => sc.toUpperCase().includes(imp.sharecode)))
      .sort((a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime())
  }, [history, sharecodes])

  if (sharecodes.length === 0) {
    return null
  }

  // Count by status
  const pending = imports.filter(i => i.status === 'pending').length
  const downloading = imports.filter(i => i.status === 'downloading').length
  const parsing = imports.filter(i => i.status === 'parsing').length
  const complete = imports.filter(i => i.status === 'complete').length
  const failed = imports.filter(i => i.status === 'failed').length

  const statusIcon: Record<string, string> = {
    pending: '⏳',
    downloading: '⬇️',
    parsing: '⚙️',
    complete: '✅',
    failed: '❌',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    downloading: 'bg-blue-100 text-blue-700',
    parsing: 'bg-indigo-100 text-indigo-700',
    complete: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Progress</CardTitle>
        <CardDescription>
          {complete + failed} / {sharecodes.length} complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <Progress
            value={((complete + failed) / sharecodes.length) * 100}
            className="h-2"
          />
          <p className="text-xs text-gray-600 mt-1">
            Pending: {pending} | Downloading: {downloading} | Parsing: {parsing} | Done: {complete} | Failed: {failed}
          </p>
        </div>

        {/* Import list */}
        <div className="space-y-3">
          {imports.length === 0 ? (
            isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <p className="text-sm text-gray-500">No imports yet.</p>
            )
          ) : (
            imports.map(imp => (
              <div key={imp.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{statusIcon[imp.status]}</span>
                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {imp.sharecode}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {imp.platform}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(imp.imported_at).toLocaleString()}
                  </p>
                  {imp.error_message && (
                    <p className="text-xs text-red-600 mt-1">{imp.error_message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${statusColor[imp.status]}`}>
                    {imp.status}
                  </Badge>

                  {imp.status === 'complete' && imp.demo_id && (
                    <Link
                      href={`/results/${imp.demo_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Results →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
