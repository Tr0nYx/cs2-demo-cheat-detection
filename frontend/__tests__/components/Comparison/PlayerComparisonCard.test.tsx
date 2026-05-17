import React from 'react'
import { render, screen } from '@testing-library/react'
import { PlayerComparisonCard } from '@/components/Comparison/PlayerComparisonCard'
import type { PlayerComparisonData } from '@/lib/hooks/usePlayerComparison'

// Mock child components to simplify testing
jest.mock('@/components/Comparison/ComponentBreakdownCard', () => ({
  ComponentBreakdownCard: ({ playerName }: { playerName: string }) => (
    <div data-testid={`breakdown-${playerName}`}>Component Breakdown</div>
  ),
}))

jest.mock('@/components/Comparison/TrendCard', () => ({
  TrendCard: ({ playerName }: { playerName: string }) => (
    <div data-testid={`trend-${playerName}`}>Trend Card</div>
  ),
}))

jest.mock('@/components/Comparison/MapAffinityCard', () => ({
  MapAffinityCard: ({ playerName }: { playerName: string }) => (
    <div data-testid={`maps-${playerName}`}>Map Affinity</div>
  ),
}))

jest.mock('@/components/Comparison/MatchHistoryCard', () => ({
  MatchHistoryCard: ({ playerName }: { playerName: string }) => (
    <div data-testid={`history-${playerName}`}>Match History</div>
  ),
}))

describe('PlayerComparisonCard', () => {
  const mockComparisonData: PlayerComparisonData = {
    playerAId: 'player1',
    playerAName: 'Alice',
    playerAComponents: {
      components: {
        ekill: { value: 1.2, percentile: 75 },
        aim: { value: 1.5, percentile: 80 },
        kast: { value: 0.9, percentile: 60 },
        util: { value: 1.1, percentile: 70 },
        clutch: { value: 0.8, percentile: 50 },
      },
      traceDatetime: '2026-05-17T10:30:00Z',
    },
    playerATrend: {
      history: [
        { date: '2026-05-16T10:00:00Z', value: 1.2 },
        { date: '2026-05-17T10:00:00Z', value: 1.3 },
      ],
      trending: true,
    },
    playerAMaps: {
      topMaps: [
        { map: 'de_mirage', traceAdjusted: 1.4 },
        { map: 'de_ancient', traceAdjusted: 1.2 },
        { map: 'de_nuke', traceAdjusted: 1.0 },
      ],
    },
    playerAHistory: {
      sharedDemos: [
        { demoId: 'demo1', date: '2026-05-17T10:00:00Z', mapId: 'de_mirage' },
      ],
    },
    playerBId: 'player2',
    playerBName: 'Bob',
    playerBComponents: {
      components: {
        ekill: { value: 1.0, percentile: 60 },
        aim: { value: 1.2, percentile: 70 },
        kast: { value: 1.0, percentile: 65 },
        util: { value: 0.9, percentile: 55 },
        clutch: { value: 0.9, percentile: 60 },
      },
      traceDatetime: '2026-05-17T10:30:00Z',
    },
    playerBTrend: {
      history: [
        { date: '2026-05-16T10:00:00Z', value: 1.0 },
        { date: '2026-05-17T10:00:00Z', value: 1.1 },
      ],
      trending: true,
    },
    playerBMaps: {
      topMaps: [
        { map: 'de_inferno', traceAdjusted: 1.3 },
      ],
    },
    playerBHistory: {
      sharedDemos: [],
    },
  }

  it('renders four metric cards for both players', () => {
    render(
      <PlayerComparisonCard
        data={mockComparisonData}
        isLoading={false}
        error={null}
      />
    )

    // Verify all 8 cards rendered (4 metrics × 2 players)
    expect(screen.getByTestId('breakdown-Alice')).toBeInTheDocument()
    expect(screen.getByTestId('breakdown-Bob')).toBeInTheDocument()
    expect(screen.getByTestId('trend-Alice')).toBeInTheDocument()
    expect(screen.getByTestId('trend-Bob')).toBeInTheDocument()
    expect(screen.getByTestId('maps-Alice')).toBeInTheDocument()
    expect(screen.getByTestId('maps-Bob')).toBeInTheDocument()
    expect(screen.getByTestId('history-Alice')).toBeInTheDocument()
    expect(screen.getByTestId('history-Bob')).toBeInTheDocument()
  })

  it('shows loading state with skeleton when isLoading is true', () => {
    render(
      <PlayerComparisonCard
        data={undefined}
        isLoading={true}
        error={null}
      />
    )

    // Should show skeleton elements
    const skeletons = screen.getAllByRole('generic')
    expect(skeletons.length).toBeGreaterThan(0)

    // Should have animate-pulse classes
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('shows error state when error is provided', () => {
    const testError = new Error('Test error message')

    render(
      <PlayerComparisonCard
        data={undefined}
        isLoading={false}
        error={testError}
      />
    )

    expect(screen.getByText('Comparison Error')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('displays player names in header', () => {
    render(
      <PlayerComparisonCard
        data={mockComparisonData}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders empty state when data is null', () => {
    render(
      <PlayerComparisonCard
        data={null}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByText('No comparison data available')).toBeInTheDocument()
  })

  it('displays player IDs in header', () => {
    render(
      <PlayerComparisonCard
        data={mockComparisonData}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByText('ID: player1')).toBeInTheDocument()
    expect(screen.getByText('ID: player2')).toBeInTheDocument()
  })
})
