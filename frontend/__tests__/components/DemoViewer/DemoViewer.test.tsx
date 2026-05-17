import { render, screen } from '@testing-library/react'
import { DemoViewer } from '@/components/DemoViewer/DemoViewer'

jest.mock('@/lib/hooks/useDemoRounds', () => ({
  useDemoRounds: () => ({
    data: {
      rounds: [
        { round_number: 1, start_tick: 100, end_tick: 200, winner: 'CT', end_reason: null, duration_ms: 1000, kills: 1, first_kill_tick: 120, bomb_planted: false },
      ],
    },
    isLoading: false,
    error: null,
  }),
}))

jest.mock('@/lib/hooks/useDemoEvents', () => ({
  useDemoEvents: () => ({ data: { kills: [], grenades: [], damage: [] } }),
}))

jest.mock('@/lib/hooks/useTickData', () => ({
  useTickData: () => ({
    data: {
      status: 'ready',
      from_tick: 100,
      to_tick: 200,
      step: 4,
      ticks: [
        {
          tick: 100,
          players: [{ steam_id: 'p1', name: 'Player One', team: 'CT', x: -2476, y: 3239, alive: true }],
          grenades: [],
        },
      ],
    },
    isGenerating: false,
  }),
}))

describe('DemoViewer', () => {
  it('renders the tactical viewer surface first', () => {
    render(<DemoViewer demoId="demo-1" analyzed />)

    expect(screen.getByTestId('demo-viewer')).toBeInTheDocument()
    expect(screen.getByTestId('demo-map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('demo-timeline')).toBeInTheDocument()
    expect(screen.getByLabelText('Round selector')).toBeInTheDocument()
    expect(screen.getByLabelText('Player visibility')).toBeInTheDocument()
  })
})
