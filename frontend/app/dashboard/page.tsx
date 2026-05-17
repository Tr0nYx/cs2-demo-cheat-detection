'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserProfile } from '@/components/UserProfile'
import { DemoHistoryTable } from '@/components/DemoHistoryTable'
import { QuickUploadCard } from '@/components/QuickUploadCard'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true)
    } else if (status === 'unauthenticated') {
      router.push('/')
    } else {
      setIsLoading(false)
    }
  }, [status, router])

  if (isLoading || status === 'loading') {
    return (
      <div className="flex-1 w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="flex-1 w-full">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Manage your demos and view your analysis history.</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Profile & History */}
          <div className="lg:col-span-2 space-y-8">
            <UserProfile />
            <DemoHistoryTable refreshKey={refreshKey} />
          </div>

          {/* Right Column: Quick Upload */}
          <div className="space-y-8">
            <QuickUploadCard
              onUploadSuccess={() => {
                setRefreshKey((k) => k + 1)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
