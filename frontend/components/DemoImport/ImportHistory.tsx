'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useImportHistory } from '@/lib/hooks/useImportHistory'
import { useImportSharecode } from '@/lib/hooks/useImportSharecode'

export function ImportHistory() {
  const { data: history, isLoading } = useImportHistory(50)
  const retryMutation = useImportSharecode()

  const handleRetry = (sharecode: string) => {
    retryMutation.mutate([sharecode])
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
        <CardTitle>Import History</CardTitle>
        <CardDescription>
          {history?.total || 0} import(s) across all time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading history...</p>
        ) : history?.imports.length === 0 ? (
          <p className="text-sm text-gray-500">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sharecode</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported At</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.imports.map(imp => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-mono text-xs">{imp.sharecode}</TableCell>
                    <TableCell className="text-sm">{imp.platform}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColor[imp.status]}`}>
                        {imp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {new Date(imp.imported_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-red-600 max-w-xs truncate">
                      {imp.error_message || '—'}
                    </TableCell>
                    <TableCell>
                      {imp.status === 'complete' && imp.demo_id && (
                        <Link
                          href={`/results/${imp.demo_id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      )}
                      {imp.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(imp.sharecode)}
                          disabled={retryMutation.isPending}
                          className="text-xs"
                        >
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
