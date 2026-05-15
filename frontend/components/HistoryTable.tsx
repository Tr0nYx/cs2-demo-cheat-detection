'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VerdictBadge } from './VerdictBadge'
import { Demo } from '@/lib/types'
import { formatTimestamp, verdictLabel } from '@/lib/utils'
import { Eye, Download, Trash2, AlertCircle, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface HistoryTableProps {
  demos: Demo[]
  onDelete?: (demoId: string) => Promise<void>
  isLoading?: boolean
}

export function HistoryTable({ demos, onDelete, isLoading = false }: HistoryTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleDelete = async (demoId: string) => {
    if (!onDelete) return
    setDeletingId(demoId)
    try {
      await onDelete(demoId)
      setDeleteConfirmId(null)
    } finally {
      setDeletingId(null)
    }
  }

  const copyToClipboard = (text: string, demoId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(demoId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getPlayerNames = (demo: Demo): string => {
    if (!demo.results?.players || demo.results.players.length === 0) {
      return 'Unknown'
    }
    return demo.results.players.map(p => p.name).join(', ')
  }

  const getTopScore = (demo: Demo): number => {
    if (!demo.results?.players || demo.results.players.length === 0) {
      return 0
    }
    return Math.max(...demo.results.players.map(p => p.overallScore))
  }

  const getVerdict = (demo: Demo): string => {
    const score = getTopScore(demo)
    return verdictLabel(score)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="h-12 animate-pulse bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    )
  }

  if (!demos || demos.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">No analyses yet</p>
          <p>Upload a .dem file to get started with cheat detection analysis.</p>
        </AlertDescription>
      </Alert>
    )
  }

  // Desktop view - Table
  return (
    <>
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Demo ID</TableHead>
              <TableHead>Players</TableHead>
              <TableHead>Verdict</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demos.map((demo) => (
              <TableRow key={demo.id}>
                <TableCell className="text-sm">
                  {formatTimestamp(demo.created_at || '')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {demo.id.substring(0, 8)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => copyToClipboard(demo.id, demo.id)}
                      title="Copy demo ID"
                    >
                      {copiedId === demo.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{getPlayerNames(demo)}</TableCell>
                <TableCell>
                  {demo.status === 'pending' ? (
                    <span className="text-xs text-gray-600 dark:text-gray-400">Processing...</span>
                  ) : demo.status === 'error' ? (
                    <span className="text-xs text-red-600 dark:text-red-400">Failed</span>
                  ) : (
                    verdictLabel(getTopScore(demo))
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {demo.status === 'done' ? (
                    <VerdictBadge score={getTopScore(demo)} size="sm" showLabel={false} />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/results/${demo.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    {demo.status === 'done' && (
                      <a href={`${process.env.NEXT_PUBLIC_API_URL}/demos/${demo.id}/download`} download>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {onDelete && (
                      <>
                        {deleteConfirmId === demo.id ? (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(demo.id)}
                              disabled={deletingId === demo.id}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirmId(demo.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-4">
        {demos.map((demo) => (
          <Card key={demo.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold">{getPlayerNames(demo)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {formatTimestamp(demo.created_at || '')}
                  </p>
                </div>
                {demo.status === 'done' && (
                  <VerdictBadge score={getTopScore(demo)} size="sm" />
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link href={`/results/${demo.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>
                {demo.status === 'done' && (
                  <a href={`${process.env.NEXT_PUBLIC_API_URL}/demos/${demo.id}/download`} download className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </a>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeleteConfirmId(demo.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>

              {deleteConfirmId === demo.id && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-semibold mb-2">Delete this analysis?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(demo.id)}
                        disabled={deletingId === demo.id}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
