'use client'

import { Activity, Crosshair, Eye, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ResultDashboardTabId = 'players' | 'trace' | 'sensitivity' | 'viewer'

const tabs: Array<{ id: ResultDashboardTabId; label: string; Icon: typeof Activity }> = [
  { id: 'players', label: 'Players', Icon: Crosshair },
  { id: 'trace', label: 'TRACE', Icon: Activity },
  { id: 'sensitivity', label: 'Sensitivity', Icon: SlidersHorizontal },
  { id: 'viewer', label: 'Viewer', Icon: Eye },
]

type ResultDashboardTabsProps = {
  players: ReactNode
  trace: ReactNode
  sensitivity: ReactNode
  viewer: ReactNode
}

export function ResultDashboardTabs({ players, trace, sensitivity, viewer }: ResultDashboardTabsProps) {
  return (
    <Tabs defaultValue="players" className="w-full">
      <TabsList
        aria-label="Result analysis modes"
        className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-border-subtle bg-surface-panel p-1 sm:grid-cols-4"
      >
        {tabs.map(({ id, label, Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="h-10 gap-2 data-[state=active]:bg-trace-primary data-[state=active]:text-surface-base"
          >
            <Icon className="size-4" aria-hidden />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="players" className="mt-4">
        {players}
      </TabsContent>
      <TabsContent value="trace" id="trace-panel" className="mt-4">
        {trace}
      </TabsContent>
      <TabsContent value="sensitivity" className="mt-4">
        {sensitivity}
      </TabsContent>
      <TabsContent value="viewer" id="viewer-panel" className="mt-4">
        {viewer}
      </TabsContent>
    </Tabs>
  )
}
