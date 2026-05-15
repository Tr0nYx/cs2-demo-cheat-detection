import { render, screen } from '@testing-library/react'
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
            { name: 'Aimbot', score: 50, interpretation: 'Suspicious' },
            { name: 'Triggerbot', score: 30, interpretation: 'Clean' },
            { name: 'Wallhack', score: 40, interpretation: 'Suspicious' },
            { name: 'Recoil', score: 45, interpretation: 'Suspicious' },
            { name: 'Bhop', score: 50, interpretation: 'Suspicious' },
            { name: 'Session Consistency', score: 55, interpretation: 'Suspicious' },
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
    expect(screen.getByText(/suspicious/i)).toBeInTheDocument()
  })

  it('displays all features in table', () => {
    render(<ResultsCard demo={mockDemo} />)
    expect(screen.getByText('Aimbot')).toBeInTheDocument()
    expect(screen.getByText('Triggerbot')).toBeInTheDocument()
    expect(screen.getByText('Wallhack')).toBeInTheDocument()
    expect(screen.getByText('Recoil')).toBeInTheDocument()
    expect(screen.getByText('Bhop')).toBeInTheDocument()
    expect(screen.getByText('Session Consistency')).toBeInTheDocument()
  })

  it('displays player name and Steam ID', () => {
    render(<ResultsCard demo={mockDemo} />)
    expect(screen.getByText('Player One')).toBeInTheDocument()
    expect(screen.getByText(/76561198000000001/)).toBeInTheDocument()
  })

  it('shows download button for completed demo', () => {
    render(<ResultsCard demo={mockDemo} />)
    const downloadLink = screen.getByText(/download demo/i)?.closest('a')
    expect(downloadLink).toBeInTheDocument()
    expect(downloadLink).toHaveAttribute('href')
    expect(downloadLink?.href).toContain('download')
  })

  it('handles empty players list', () => {
    const demoNoPlayers: Demo = {
      ...mockDemo,
      results: {
        overall_score: 0,
        overall_verdict: 'clean',
        players: [],
      },
    }

    render(<ResultsCard demo={demoNoPlayers} />)
    expect(screen.getByText(/no players found/i)).toBeInTheDocument()
  })

  it('handles missing results gracefully', () => {
    const demoNoResults: Demo = {
      ...mockDemo,
      status: 'done',
      results: undefined,
    }

    render(<ResultsCard demo={demoNoResults} />)
    // Should show something, at least the demo ID
    expect(screen.getByText(/demo-123/)).toBeInTheDocument()
  })
})
