'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HistoryTable } from '@/components/HistoryTable'
import { fetchDemoList, deleteDemo } from '@/lib/api'
import { Demo } from '@/lib/types'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function HistoryPage() {
  const [demos, setDemos] = useState<Demo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDemos = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetchDemoList(1, 100)
        // Handle both { demos: [...] } and { data: [...] } response formats
        const demoList = (response as any).demos || (response as any).data || []
        setDemos(Array.isArray(demoList) ? demoList : [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load history'
        setError(message)
        console.error('Failed to load demo history:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDemos()
  }, [])

  const handleDelete = async (demoId: string) => {
    try {
      await deleteDemo(demoId)
      setDemos(demos.filter(d => d.id !== demoId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete demo'
      setError(message)
      console.error('Failed to delete demo:', err)
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <main className="flex flex-col items-center justify-center py-8 px-4 max-w-4xl w-full">
        <div className="w-full mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Analysis History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View and manage your previous demo analyses
          </p>
          <Link href="/">
            <Button variant="outline">← Back to Upload</Button>
          </Link>
        </div>

        {error && (
          <Card className="w-full mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="pt-6 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Analyses</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${demos.length} ${demos.length === 1 ? 'analysis' : 'analyses'} total`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HistoryTable
              demos={demos}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
