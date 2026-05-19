'use client'

import Link from 'next/link'
import { BarChart3, GitCompare, History, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileNavProps {
  playerId: string
  playerName?: string | null
  active: 'overview' | 'demos' | 'stats' | 'compare'
}

const items = [
  { id: 'overview', label: 'Overview', href: (id: string) => `/players/${id}`, icon: UserRound },
  { id: 'demos', label: 'Demos', href: (id: string) => `/players/${id}/demos`, icon: History },
  { id: 'stats', label: 'Stats', href: (id: string) => `/players/${id}/stats`, icon: BarChart3 },
  { id: 'compare', label: 'Compare', href: (id: string) => `/players/${id}/compare`, icon: GitCompare },
] as const

export function ProfileNav({ playerId, playerName, active }: ProfileNavProps) {
  return (
    <nav className="space-y-3" aria-label="Player profile navigation">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/leaderboards" className="hover:text-gray-900 dark:hover:text-gray-100">
          Leaderboards
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 dark:text-gray-200">{playerName || playerId}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id

          return (
            <Link
              key={item.id}
              href={item.href(playerId)}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition',
                isActive
                  ? 'border-gray-950 bg-gray-950 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-950'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
