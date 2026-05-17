'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserProfile } from '@/components/UserProfile'
import { DemoHistoryTable } from '@/components/DemoHistoryTable'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

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
            <DemoHistoryTable />
          </div>

          {/* Right Column: Quick Upload (placeholder for now) */}
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Upload</h2>
              <p className="text-gray-400 text-sm mb-4">Upload a demo file to get started with analysis.</p>
              <p className="text-xs text-gray-500">(Coming soon in next section)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
