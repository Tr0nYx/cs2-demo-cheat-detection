import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ResultsPage from '@/app/results/[id]/page'
import type { Demo } from '@/lib/types'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'demo-123' }),
}))

const useDemoFetchMock = jest.fn()
const useDemoDetailMock = jest.fn()

jest.mock('@/lib/hooks/useDemoFetch', () => ({
  useDemoFetch: (...args: unknown[]) => useDemoFetchMock(...args),
}))

jest.mock('@/lib/hooks/useDemoDetail', () => ({
  useDemoDetail: (...args: unknown[]) => useDemoDetailMock(...args),
}))

jest.mock('@/components/DemoDetail/TraceCard', () => ({
  TraceCard: () => <div>TRACE panel mocked</div>,
}))

jest.mock('@/components/Analytics/SensitivityTuner', () => ({
  SensitivityTuner: () => <div>Sensitivity panel mocked</div>,
}))

jest.mock('@/components/DemoViewer/DemoViewer', () => ({
  DemoViewer: () => <div>Viewer panel mocked</div>,
}))

const demo: Demo = {
  id: 'demo-123',
  status: 'done',
  map: 'de_nuke',
  created_at: '2026-05-19T10:00:00Z',
  results: {
    overall_score: 88,
    overall_verdict: 'likely_cheating',
    modelVersion: 'test-model',
    players: [
      {
        steamId: '76561198000000001',
        name: 'Player One',
        overallScore: 88,
        overallVerdict: 'likely_cheating',
        features: [
          {
            name: 'aimbot',
            score: 88,
            interpretation: 'High review activity detected',
            evidence: ['10 kills analyzed'],
            confidence: 'high',
            evidenceStrength: 'strong',
          },
        ],
      },
    ],
  },
}

function mockReady(currentDemo: Demo | null = demo) {
  useDemoFetchMock.mockReturnValue({
    demo: currentDemo,
    isLoading: false,
    error: null,
    isTimeout: false,
    failureCount: 0,
  })
  useDemoDetailMock.mockReturnValue({
    data: {
      metadata: { map: 'de_nuke' },
      featureVectors: null,
      baselineSuspicion: null,
    },
  })
}

describe('ResultsPage dashboard integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    useDemoFetchMock.mockReturnValue({
      demo: undefined,
      isLoading: true,
      error: null,
      isTimeout: false,
      failureCount: 0,
    })
    useDemoDetailMock.mockReturnValue({ data: null })

    render(<ResultsPage />)

    expect(screen.getByText(/loading analysis results/i)).toBeInTheDocument()
  })

  it('renders dashboard overview and players tab by default', () => {
    mockReady()

    render(<ResultsPage />)

    expect(screen.getByText('Review Orientation')).toBeInTheDocument()
    expect(screen.getByText('Real players')).toBeInTheDocument()
    expect(screen.getByText('Stored samples')).toBeInTheDocument()
    expect(screen.getByText('Top Player Review Signals')).toBeInTheDocument()
    expect(screen.getAllByText('Player One').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: /players/i })).toHaveAttribute('data-state', 'active')
    expect(screen.getAllByRole('link', { name: /profile/i })[0]).toHaveAttribute('href', '/players/76561198000000001')
    expect(screen.getAllByRole('link', { name: /match report/i })[0]).toHaveAttribute('href', '/matches/demo-123')
    expect(screen.getByRole('button', { name: /review signals/i })).toBeInTheDocument()
    expect(screen.getByText(/what happened/i)).toBeInTheDocument()
    expect(screen.getByText(/why this score/i)).toBeInTheDocument()
  })

  it('filters rows and keeps selected-player narrative usable', async () => {
    mockReady({
      ...demo,
      results: {
        ...demo.results!,
        players: [
          demo.results!.players[0],
          {
            steamId: '76561198000000002',
            name: 'Limited Player',
            overallScore: 25,
            overallVerdict: 'clean',
            features: [{
              name: 'triggerbot',
              score: 25,
              interpretation: 'Low review signal',
              evidence: [],
              confidence: 'low',
              evidenceStrength: 'weak',
              warning: 'Low sample count',
            }],
          },
        ],
      },
    })

    render(<ResultsPage />)

    await userEvent.click(screen.getByRole('button', { name: /capped\/limited/i }))
    expect(screen.getAllByText('Limited Player').length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByText('Limited Player')[0])
    expect(screen.getByText(/No stored evidence samples are available/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Limited evidence/i).length).toBeGreaterThan(0)
  })

  it('switches analysis modes without rendering the old stacked layout', async () => {
    mockReady()

    render(<ResultsPage />)

    expect(screen.queryByText('TRACE panel mocked')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /trace/i }))
    expect(screen.getByText('TRACE panel mocked')).toBeVisible()

    await userEvent.click(screen.getByRole('tab', { name: /sensitivity/i }))
    expect(screen.getByText('Sensitivity panel mocked')).toBeVisible()

    await userEvent.click(screen.getByRole('tab', { name: /viewer/i }))
    expect(screen.getByText('Viewer panel mocked')).toBeVisible()
  })

  it('shows aggregate-only framing without profile link', () => {
    mockReady({
      ...demo,
      results: {
        overall_score: 100,
        overall_verdict: 'likely_cheating',
        players: [
          {
            steamId: '0',
            name: 'Aggregate',
            overallScore: 100,
            overallVerdict: 'likely_cheating',
            features: demo.results!.players[0].features,
          },
        ],
      },
    })

    render(<ResultsPage />)

    expect(screen.getByText(/demo-level aggregate only/i)).toBeInTheDocument()
    expect(screen.getAllByText(/no player attribution/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument()
  })

  it('keeps no-player state usable', () => {
    mockReady({
      ...demo,
      results: {
        overall_score: 0,
        overall_verdict: 'clean',
        players: [],
      },
    })

    render(<ResultsPage />)

    expect(screen.getByText(/no player rows found/i)).toBeInTheDocument()
  })
})
