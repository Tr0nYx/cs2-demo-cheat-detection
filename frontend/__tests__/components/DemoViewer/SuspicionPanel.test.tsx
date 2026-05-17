import { fireEvent, render, screen } from '@testing-library/react'
import { SuspicionPanel } from '@/components/DemoViewer/SuspicionPanel'

describe('SuspicionPanel', () => {
  it('lists flagged kills as review signals and seeks 32 ticks before the kill', () => {
    const onReview = jest.fn()
    render(
      <SuspicionPanel
        rounds={[{ round_number: 1, start_tick: 100, end_tick: 300, winner: 'CT', end_reason: null, duration_ms: 1, kills: 1, first_kill_tick: 150, bomb_planted: false }]}
        kills={[{
          round_number: 1,
          tick: 150,
          attacker: { steam_id: 'a', name: 'Attacker' },
          victim: { steam_id: 'v', name: 'Victim' },
          weapon: 'ak47',
          headshot: true,
          review_signal: { suspicion_score: 0.82, flag_reasons: ['snap_ratio'] },
        }]}
        onReview={onReview}
      />
    )

    expect(screen.getByTestId('suspicion-panel')).toHaveTextContent('Review Signals')
    expect(screen.getByText('snap_ratio')).toBeInTheDocument()
    expect(screen.queryByText(/proof|ban|confirmed/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Review'))
    expect(onReview).toHaveBeenCalledWith(118)
  })
})
