import { fireEvent, render, screen } from '@testing-library/react'
import { Timeline } from '@/components/DemoViewer/Timeline'

const rounds = [
  { round_number: 1, start_tick: 100, end_tick: 200, winner: 'CT', end_reason: null, duration_ms: 1000, kills: 1, first_kill_tick: 120, bomb_planted: false },
  { round_number: 2, start_tick: 220, end_tick: 340, winner: 'T', end_reason: null, duration_ms: 1000, kills: 1, first_kill_tick: 240, bomb_planted: true },
]

describe('Timeline', () => {
  it('renders playback controls and calls handlers', () => {
    const onPlay = jest.fn()
    const onSpeed = jest.fn()
    render(
      <Timeline
        rounds={rounds}
        events={{ kills: [], grenades: [], damage: [] }}
        tick={120}
        playing={false}
        speed={1}
        onPlay={onPlay}
        onPause={jest.fn()}
        onSeek={jest.fn()}
        onSpeed={onSpeed}
      />
    )

    fireEvent.click(screen.getByLabelText('Play playback'))
    fireEvent.click(screen.getByText('2x'))

    expect(onPlay).toHaveBeenCalled()
    expect(onSpeed).toHaveBeenCalledWith(2)
  })
})
