import { render, screen } from '@testing-library/react'

import MatchDetailPage from '@/app/matches/[demoId]/page'
import { useMatchDetail } from '@/lib/hooks/useMatchDetail'
import type { MatchDetailViewModel } from '@/lib/types'

jest.mock('next/navigation', () => ({
  useParams: () => ({ demoId: 'demo-1' }),
}))

jest.mock('@/lib/hooks/useMatchDetail', () => ({
  useMatchDetail: jest.fn(),
}))

jest.mock('@/components/DemoViewer/DemoViewer', () => ({
  DemoViewer: ({ demoId }: { demoId: string }) => <div data-testid="demo-viewer">Viewer shell for {demoId}</div>,
}))

const mockedUseMatchDetail = useMatchDetail as jest.MockedFunction<typeof useMatchDetail>

const viewModel: MatchDetailViewModel = {
  summary: {
    demoId: 'demo-1',
    map: 'de_mirage',
    outcome: 'win',
    status: 'done',
    uploadedAt: '2026-05-19T10:00:00Z',
    processedAt: '2026-05-19T10:10:00Z',
    originalFilename: 'match.dem',
    steamMatchId: null,
    hltvMatchUrl: null,
    sharecode: null,
    sourcePlatform: 'sharecode',
    score: null,
    scoreUnavailableReason: 'Score unavailable from current analysis payload',
  },
  participants: [{
    steamId: '76561198000000001',
    name: 'Research Player',
    team: null,
    overallScore: 24,
    overallVerdict: 'clean',
    profileHref: '/players/76561198000000001',
    features: [{ name: 'aimbot', score: 10, interpretation: 'Low review signal' }],
  }],
  rounds: [{
    round_number: 1,
    start_tick: 0,
    end_tick: 1200,
    winner: 'CT',
    end_reason: 'elimination',
    duration_ms: 94000,
    kills: 4,
    first_kill_tick: 320,
    bomb_planted: false,
  }],
  events: {
    kills: [{
      round_number: 1,
      tick: 320,
      attacker: { steam_id: '76561198000000001', name: 'Research Player' },
      victim: { steam_id: '76561198000000002', name: 'Opponent' },
      weapon: 'ak47',
      headshot: true,
      review_signal: { suspicion_score: 0.4, flag_reasons: ['fast reaction'] },
    }],
    grenades: [],
    damage: [],
  },
  flaggedKills: [{
    round_number: 1,
    tick: 320,
    attacker: { steam_id: '76561198000000001', name: 'Research Player' },
    victim: { steam_id: '76561198000000002', name: 'Opponent' },
    weapon: 'ak47',
    headshot: true,
    review_signal: { suspicion_score: 0.4, flag_reasons: ['fast reaction'] },
  }],
  dataAvailability: {
    hasScore: false,
    hasParticipants: true,
    hasRounds: true,
    hasEvents: true,
    hasFlaggedKills: true,
  },
}

function mockHook(overrides: Partial<ReturnType<typeof useMatchDetail>> = {}) {
  mockedUseMatchDetail.mockReturnValue({
    data: viewModel,
    demo: { id: 'demo-1', status: 'done', map: 'de_mirage' },
    rounds: viewModel.rounds,
    events: viewModel.events,
    isLoading: false,
    isError: false,
    hasPartialError: false,
    errors: { demo: null, detail: null, rounds: null, events: null },
    refetch: jest.fn(),
    ...overrides,
  })
}

describe('Match detail page integration', () => {
  beforeEach(() => {
    mockedUseMatchDetail.mockReset()
  })

  it('renders loading state without crashing', () => {
    mockHook({ data: null, demo: null, isLoading: true })

    render(<MatchDetailPage />)

    expect(screen.getByText(/loading match report/i)).toBeInTheDocument()
  })

  it('renders header, participants, rounds, events, and viewer shell', () => {
    mockHook()

    render(<MatchDetailPage />)

    expect(screen.getByText('Match detail')).toBeInTheDocument()
    expect(screen.getByText('de_mirage match report')).toBeInTheDocument()
    expect(screen.getAllByText('Research Player')[0]).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Flagged kill review signals')).toBeInTheDocument()
    expect(screen.getByTestId('demo-viewer')).toHaveTextContent('demo-1')
  })

  it('keeps overview visible when rounds or events fail', () => {
    mockHook({
      hasPartialError: true,
      errors: { demo: null, detail: null, rounds: new Error('rounds failed'), events: new Error('events failed') },
    })

    render(<MatchDetailPage />)

    expect(screen.getByText('Partial data notice')).toBeInTheDocument()
    expect(screen.getByText('de_mirage match report')).toBeInTheDocument()
  })

  it('renders player and result links', () => {
    mockHook()

    render(<MatchDetailPage />)

    expect(screen.getAllByRole('link', { name: /Research Player/i })[0]).toHaveAttribute(
      'href',
      '/players/76561198000000001'
    )
    expect(screen.getByRole('link', { name: /Analysis results/i })).toHaveAttribute('href', '/results/demo-1')
  })
})
