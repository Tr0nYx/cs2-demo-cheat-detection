import React from 'react'
import { render, screen } from '@testing-library/react'
import { DemoHistorySection } from '@/components/PlayerProfile/DemoHistorySection'
import { StatsSection } from '@/components/PlayerProfile/StatsSection'
import { SteamProfileSection } from '@/components/PlayerProfile/SteamProfileSection'
import { TraceSection } from '@/components/PlayerProfile/TraceSection'
import { ResearchDisclaimerBanner } from '@/components/ResearchDisclaimerBanner'
import type { PlayerHistoryResponse, PlayerStatsResponse } from '@/lib/hooks/usePlayerProfile'
import type { TraceHistoryCollectionDto } from '@/lib/types'

const traceHistory: TraceHistoryCollectionDto = {
  traces: [{
    traceBase: 1.2,
    traceAdjusted: 1.4,
    traceNormalized: 0.7,
    trustMultiplier: 0.95,
    components: { ekill: 1.1, aim: 1.2, kast: 1.0, util: 0.9, clutch: 1.3 },
    percentiles: { ekill: 80, aim: 75, kast: 65, util: 55, clutch: 85 },
    trustMultiplierPercentile: 70,
    traceAdjustedPercentile: 82,
    calibrationVersion: 'default-v1',
    calculatedAt: '2026-05-19T10:00:00Z',
    createdAt: '2026-05-19T10:00:00Z',
  }],
  pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
}

const history: PlayerHistoryResponse = {
  steam_id: '76561198000000001',
  limit: 10,
  offset: 0,
  steam_profile: null,
  results: [{
    result_id: 'result-1',
    demo_id: 'demo-1',
    player: { steam_id: '76561198000000001', display_name: 'Research Player' },
    scores: { aimbot: 10, wallhack: 5, triggerbot: 0, recoil: 12, bhop: 4, session_consistency: 15, overall: 18 },
    label: 'clean',
    analyzed_at: '2026-05-19T10:00:00Z',
    demo: { map: 'de_mirage', outcome: 'win', uploaded_at: '2026-05-19T09:00:00Z' },
  }],
}

const stats: PlayerStatsResponse = {
  maps: [{ map: 'de_mirage', demoCount: 4, winRate: 0.5, averageTraceScore: 1.25 }],
  weapons: [{ weapon: 'ak47', category: 'rifle', usageCount: 30, killCount: 12, killRate: 0.4 }],
  metadata: { dataWindow: '30d', computedAt: '2026-05-19T10:00:00Z', demoCount: 4, insufficientData: false },
}

describe('Player profile sections', () => {
  it('renders the prominent research disclaimer', () => {
    render(<ResearchDisclaimerBanner />)

    expect(screen.getByText(/research signals from post-game demo analysis/i)).toBeInTheDocument()
    expect(screen.getByText(/not proof of cheating/i)).toBeInTheDocument()
  })

  it('renders TRACE with research context labels', () => {
    render(<TraceSection traceHistory={traceHistory} />)

    expect(screen.getByText('TRACE score and components')).toBeInTheDocument()
    expect(screen.getByText(/82th percentile TRACE score \(research signal\)/i)).toBeInTheDocument()
    expect(screen.getByText(/AIM component pattern \(research signal\)/i)).toBeInTheDocument()
  })

  it('renders demo history with TRACE signal language', () => {
    render(<DemoHistorySection playerId="76561198000000001" history={history} />)

    expect(screen.getByText('Demo history')).toBeInTheDocument()
    expect(screen.getByText('TRACE signal')).toBeInTheDocument()
    expect(screen.getByText('de_mirage')).toBeInTheDocument()
  })

  it('renders stats and insufficient data states', () => {
    const { rerender } = render(<StatsSection playerId="76561198000000001" stats={stats} />)

    expect(screen.getByText('Map and weapon stats')).toBeInTheDocument()
    expect(screen.getByText('de_mirage')).toBeInTheDocument()
    expect(screen.getByText('ak47')).toBeInTheDocument()

    rerender(<StatsSection playerId="76561198000000001" stats={{ ...stats, metadata: { ...stats.metadata, insufficientData: true } }} />)
    expect(screen.getByText(/Insufficient data/i)).toBeInTheDocument()
  })

  it('omits Steam profile section when profile data is unavailable', () => {
    const { container, rerender } = render(<SteamProfileSection profile={null} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<SteamProfileSection profile={{ steam_id: '76561198000000001', persona_name: 'Steam Persona', visibility_state: 'public' }} />)
    expect(screen.getByText('Steam profile reference')).toBeInTheDocument()
    expect(screen.getAllByText(/for research reference only/i)).toHaveLength(2)
  })
})
