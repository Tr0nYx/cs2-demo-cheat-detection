import { render, screen } from '@testing-library/react'
import { HistoryTable } from '@/components/HistoryTable'
import { Demo } from '@/lib/types'

const mockDemos: Demo[] = [
  {
    id: 'demo-001',
    status: 'done',
    created_at: '2026-05-15T10:00:00Z',
    updated_at: '2026-05-15T10:05:00Z',
    results: {
      overall_score: 25,
      overall_verdict: 'clean',
      players: [
        {
          steamId: '76561198000000001',
          name: 'Player One',
          overallScore: 25,
          overallVerdict: 'clean',
          features: [],
        },
      ],
    },
  },
  {
    id: 'demo-002',
    status: 'done',
    created_at: '2026-05-14T10:00:00Z',
    updated_at: '2026-05-14T10:05:00Z',
    results: {
      overall_score: 75,
      overall_verdict: 'likely_cheating',
      players: [
        {
          steamId: '76561198000000002',
          name: 'Player Two',
          overallScore: 75,
          overallVerdict: 'likely_cheating',
          features: [],
        },
      ],
    },
  },
]

describe('HistoryTable', () => {
  it('renders demo list', () => {
    const { container } = render(<HistoryTable demos={mockDemos} />)
    expect(container.textContent).toContain('Player One')
    expect(container.textContent).toContain('Player Two')
  })

  it('shows empty state when no demos', () => {
    render(<HistoryTable demos={[]} />)
    expect(screen.getByText(/no analyses yet/i)).toBeInTheDocument()
  })

  it('shows demo ID', () => {
    const { container } = render(<HistoryTable demos={[mockDemos[0]]} />)
    expect(container.textContent).toContain('demo-001')
  })

  it('shows loading state', () => {
    const { container } = render(<HistoryTable demos={[]} isLoading={true} />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows processing status for pending demos', () => {
    const pendingDemo: Demo = {
      ...mockDemos[0],
      status: 'pending',
    }
    render(<HistoryTable demos={[pendingDemo]} />)
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
  })
})
