'use client'

import React, { useState, useEffect } from 'react'
import { fetchPublicMetrics } from '@/lib/api'

interface Metrics {
  total_demos: number
  average_suspicion: number
  total_games_played: number
}

export function PublicMetricsSection() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true)
        const data = await fetchPublicMetrics()
        setMetrics(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch public metrics:', err)
        setError('Unable to load metrics')
        setMetrics(null)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [])

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(num))
  }

  return (
    <section id="metrics" className="w-full py-16 sm:py-24 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Community Insights
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Real-time statistics from analyzed demonstrations
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error || !metrics ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Metrics unavailable</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Demos Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {formatNumber(metrics.total_demos)}
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                Demos Analyzed
              </p>
            </div>

            {/* Average Suspicion Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl sm:text-5xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                {(metrics.average_suspicion || 0).toFixed(1)}%
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                Average Suspicion Score
              </p>
            </div>

            {/* Games Played Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl sm:text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                {formatNumber(metrics.total_games_played)}
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                Games Played
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
