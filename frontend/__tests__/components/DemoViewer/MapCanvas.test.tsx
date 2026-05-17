import { render, screen } from '@testing-library/react'
import { MapCanvas } from '@/components/DemoViewer/MapCanvas'

describe('MapCanvas', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
  })

  it('renders a stable canvas element', () => {
    render(
      <MapCanvas
        tick={{
          tick: 100,
          players: [{ steam_id: 'p1', team: 'CT', x: -2476, y: 3239, yaw: 90, alive: true }],
          grenades: [{ type: 'smoke', x: -2476, y: 3239 }],
        }}
      />
    )

    expect(screen.getByTestId('demo-map-canvas')).toBeInTheDocument()
  })
})
