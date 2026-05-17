'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchUserDemos, DemoListResponse } from '@/lib/api'
import { Demo } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  done: 'bg-green-500/20 text-green-300',
  error: 'bg-red-500/20 text-red-300',
}

const SUSPICION_COLORS: Record<string, string> = {
  clean: 'text-green-400',
  suspicious: 'text-yellow-400',
  likely_cheating: 'text-red-400',
}

interface SortState {
  sortBy: 'date' | 'suspicion'
  sortOrder: 'asc' | 'desc'
}

export function DemoHistoryTable() {
  const router = useRouter()
  const [demos, setDemos] = useState<Demo[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  })
  const [sort, setSort] = useState<SortState>({ sortBy: 'date', sortOrder: 'desc' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDemos = async (page: number, sortBy: 'date' | 'suspicion', sortOrder: 'asc' | 'desc') => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetchUserDemos(page, 20, sortBy, sortOrder)
      setDemos(response.demos)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demos')
      setDemos([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDemos(pagination.page, sort.sortBy, sort.sortOrder)
  }, [])

  const handleSort = (column: 'date' | 'suspicion') => {
    const newSort: SortState =
      sort.sortBy === column && sort.sortOrder === 'desc'
        ? { sortBy: column, sortOrder: 'asc' }
        : { sortBy: column, sortOrder: 'desc' }

    setSort(newSort)
    loadDemos(1, newSort.sortBy, newSort.sortOrder)
  }

  const handlePrevious = () => {
    if (pagination.page > 1) {
      const newPage = pagination.page - 1
      setPagination({ ...pagination, page: newPage })
      loadDemos(newPage, sort.sortBy, sort.sortOrder)
    }
  }

  const handleNext = () => {
    if (pagination.hasMore) {
      const newPage = pagination.page + 1
      setPagination({ ...pagination, page: newPage })
      loadDemos(newPage, sort.sortBy, sort.sortOrder)
    }
  }

  const handleDemoClick = (demoId: string) => {
    router.push(`/results/${demoId}`)
  }

  const getSuspicionScore = (demo: Demo): number => {
    return demo.results?.overall_score ?? 0
  }

  const getSuspicionLabel = (score: number): string => {
    if (score < 0.33) return 'clean'
    if (score < 0.67) return 'suspicious'
    return 'likely_cheating'
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return 'Invalid date'
    }
  }

  const formatSuspicionScore = (score: number): string => {
    return (score * 100).toFixed(0) + '%'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Demo History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-400">Loading demos...</span>
          </div>
        ) : demos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No demos uploaded yet.</p>
            <p className="text-sm text-gray-500 mt-2">Upload your first demo to get started with analysis.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Demo File</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Map</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                      Upload Date {sort.sortBy === 'date' && (sort.sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-300 cursor-pointer hover:text-white" onClick={() => handleSort('suspicion')}>
                      Suspicion {sort.sortBy === 'suspicion' && (sort.sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {demos.map((demo) => {
                    const suspicionScore = getSuspicionScore(demo)
                    const suspicionLabel = getSuspicionLabel(suspicionScore)
                    return (
                      <tr
                        key={demo.id}
                        onClick={() => handleDemoClick(demo.id)}
                        className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-white truncate max-w-xs">{demo.id}</td>
                        <td className="py-3 px-4 text-gray-300">Unknown</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[demo.status] || 'bg-gray-700 text-gray-300'}`}>
                            {demo.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{formatDate(demo.created_at)}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${SUSPICION_COLORS[suspicionLabel]}`}>
                          {demo.status === 'done' ? formatSuspicionScore(suspicionScore) : 'Pending'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {demos.map((demo) => {
                const suspicionScore = getSuspicionScore(demo)
                const suspicionLabel = getSuspicionLabel(suspicionScore)
                return (
                  <div
                    key={demo.id}
                    onClick={() => handleDemoClick(demo.id)}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-white truncate">{demo.id}</p>
                        <p className="text-sm text-gray-400">{formatDate(demo.created_at)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[demo.status] || 'bg-gray-700 text-gray-300'}`}>
                        {demo.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Map: Unknown</span>
                      <span className={`font-semibold ${SUSPICION_COLORS[suspicionLabel]}`}>
                        {demo.status === 'done' ? formatSuspicionScore(suspicionScore) : 'Pending'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <button
                  onClick={handlePrevious}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="text-sm text-gray-400">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)} ({pagination.total} total)
                </span>

                <button
                  onClick={handleNext}
                  disabled={!pagination.hasMore}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
