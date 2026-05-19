import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsCard } from '@/components/ResultsCard'
import { Demo } from '@/lib/types'

describe('ResultsCard', () => {
  const mockDemo: Demo = {
    id: 'demo-123',
    status: 'done',
    created_at: '2026-05-15T10:00:00Z',
    updated_at: '2026-05-15T10:05:00Z',
    results: {
      overall_score: 45,
      overall_verdict: 'suspicious',
      players: [
        {
          steamId: '76561198000000001',
          name: 'Player One',
          overallScore: 45,
          overallVerdict: 'suspicious',
          features: [
            { name: 'aimbot', score: 50, interpretation: 'Suspicious' },
            { name: 'triggerbot', score: 30, interpretation: 'Clean' },
            { name: 'wallhack', score: 40, interpretation: 'Suspicious' },
            { name: 'recoil', score: 45, interpretation: 'Suspicious' },
            { name: 'bhop', score: 50, interpretation: 'Suspicious' },
            { name: 'session', score: 55, interpretation: 'Suspicious' },
          ],
        },
      ],
    },
  }

  it('renders analysis in progress for pending status', () => {
    const pendingDemo: Demo = {
      ...mockDemo,
      status: 'pending',
      results: undefined,
    }

    render(<ResultsCard demo={pendingDemo} />)
    expect(screen.getByText(/analysis in progress/i)).toBeInTheDocument()
    expect(screen.getByText(/analysis running/i)).toBeInTheDocument()
  })

  it('renders error message for error status', () => {
    const errorDemo: Demo = {
      ...mockDemo,
      status: 'error',
      error_message: 'Demo file is corrupted',
      results: undefined,
    }

    render(<ResultsCard demo={errorDemo} />)
    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument()
    expect(screen.getByText(/corrupted/i)).toBeInTheDocument()
  })

  it('renders verdict badge for completed analysis', () => {
    render(<ResultsCard demo={mockDemo} />)
    expect(screen.getByText(/analysis results/i)).toBeInTheDocument()
    // Check that the overall section is rendered
    expect(screen.getByText(/overall suspicion level/i)).toBeInTheDocument()
  })

  it('displays all features in table', () => {
    render(<ResultsCard demo={mockDemo} />)
    expect(screen.getByText('aimbot')).toBeInTheDocument()
    expect(screen.getByText('triggerbot')).toBeInTheDocument()
    expect(screen.getByText('wallhack')).toBeInTheDocument()
    expect(screen.getByText('recoil')).toBeInTheDocument()
    expect(screen.getByText('bhop')).toBeInTheDocument()
    expect(screen.getByText('session')).toBeInTheDocument()
  })

  it('displays player name and Steam ID', () => {
    render(<ResultsCard demo={mockDemo} />)
    expect(screen.getByText('Player One')).toBeInTheDocument()
    expect(screen.getByText(/76561198000000001/)).toBeInTheDocument()
  })

  it('expands feature evidence when measurements are available', async () => {
    const demoWithEvidence: Demo = {
      ...mockDemo,
      results: {
        ...mockDemo.results!,
        players: [
          {
            ...mockDemo.results!.players[0],
            features: [
              {
                name: 'aimbot',
                score: 100,
                interpretation: 'Highly suspicious activity detected',
                method: 'aimbot_multifeature_sigmoid',
                evidence: ['218 kills analyzed', 'Mean snap ratio 2.03'],
              },
            ],
          },
        ],
      },
    }

    render(<ResultsCard demo={demoWithEvidence} />)

    await userEvent.click(screen.getByRole('button', { name: /toggle aimbot details/i }))

    expect(screen.getByText('aimbot_multifeature_sigmoid')).toBeInTheDocument()
    expect(screen.getByText('218 kills analyzed')).toBeInTheDocument()
    expect(screen.getByText('Mean snap ratio 2.03')).toBeInTheDocument()
  })

  it('labels Steam ID 0 results as demo-level aggregates', () => {
    const aggregateDemo: Demo = {
      ...mockDemo,
      results: {
        overall_score: 100,
        overall_verdict: 'likely_cheating',
        players: [
          {
            steamId: '0',
            name: 'Demo Level Result',
            overallScore: 100,
            overallVerdict: 'likely_cheating',
            features: [
              { name: 'aimbot', score: 100, interpretation: 'Highly suspicious activity detected' },
            ],
          },
        ],
      },
    }

    render(<ResultsCard demo={aggregateDemo} />)

    expect(screen.getByText('Demo-level result only')).toBeInTheDocument()
    expect(screen.getByText('Demo-wide aggregate')).toBeInTheDocument()
    expect(screen.getByText('No player attribution')).toBeInTheDocument()
    expect(screen.queryByText('Demo Level Result')).not.toBeInTheDocument()
  })

  it('shows download button for completed demo', () => {
    render(<ResultsCard demo={mockDemo} />)
    expect(screen.getByText(/download demo/i)).toBeInTheDocument()
  })

  it('handles empty players list gracefully', () => {
    const demoNoPlayers: Demo = {
      ...mockDemo,
      results: {
        overall_score: 0,
        overall_verdict: 'clean',
        players: [],
      },
    }

    render(<ResultsCard demo={demoNoPlayers} />)
    // Should render without error
    expect(screen.getByText(/analysis results/i)).toBeInTheDocument()
  })

  it('renders Phase 20 calibration and score cap metadata', async () => {
    const demoWithCalibration: Demo = {
      ...mockDemo,
      results: {
        ...mockDemo.results!,
        players: [
          {
            ...mockDemo.results!.players[0],
            features: [
              {
                name: 'aimbot',
                score: 49,
                interpretation: 'Minor anomalies observed',
                confidence: 'medium',
                evidenceStrength: 'medium',
                scoreCapApplied: true,
                scoreCapReason: 'Capped due to proxy only evidence',
                independentSignals: ['snap'],
              },
            ],
          },
        ],
      },
    }

    render(<ResultsCard demo={demoWithCalibration} />)

    await userEvent.click(screen.getByRole('button', { name: /toggle aimbot details/i }))

    expect(screen.getByText(/confidence:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/medium/i)).toHaveLength(2)
    expect(screen.getByText(/evidence strength:/i)).toBeInTheDocument()
    expect(screen.getByText(/calibration cap applied:/i)).toBeInTheDocument()
    expect(screen.getByText(/capped due to proxy only evidence/i)).toBeInTheDocument()
    expect(screen.getByText(/detected signals:/i)).toBeInTheDocument()
  })
})
