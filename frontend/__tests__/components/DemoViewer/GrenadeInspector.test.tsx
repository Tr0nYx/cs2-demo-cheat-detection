import { fireEvent, render, screen } from '@testing-library/react'
import { GrenadeInspector } from '@/components/DemoViewer/GrenadeInspector'

const grenades = [
  {
    round_number: 1,
    tick: 120,
    time_ms: 1000,
    thrower: { steam_id: 'p1', name: 'Player One' },
    type: 'smoke',
    start: { x: 0, y: 0, z: 0 },
    end: { x: 100, y: 100, z: 0 },
    end_map_px: 100,
    end_map_py: 100,
    trajectory: [],
  },
  {
    round_number: 2,
    tick: 220,
    time_ms: 2000,
    thrower: { steam_id: 'p2', name: 'Player Two' },
    type: 'flash',
    start: { x: 0, y: 0, z: 0 },
    end: { x: 500, y: 500, z: 0 },
    end_map_px: 500,
    end_map_py: 500,
    trajectory: [],
  },
]

describe('GrenadeInspector', () => {
  it('filters by type and seeks to grenade ticks', () => {
    const onSeek = jest.fn()
    render(<GrenadeInspector grenades={grenades} onSeek={onSeek} />)

    fireEvent.change(screen.getByLabelText('Grenade type filter'), { target: { value: 'smoke' } })

    expect(screen.getAllByText('Player One').length).toBeGreaterThan(0)
    expect(screen.queryByText('tick 220')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Seek'))
    expect(onSeek).toHaveBeenCalledWith(120)
  })

  it('highlights similar throws without proof language', () => {
    render(<GrenadeInspector grenades={grenades} onSeek={jest.fn()} />)

    fireEvent.click(screen.getAllByText('Find similar throws')[0])

    expect(screen.getByTestId('grenade-inspector')).toBeInTheDocument()
    expect(screen.queryByText(/proof|ban|confirmed/i)).not.toBeInTheDocument()
  })
})
