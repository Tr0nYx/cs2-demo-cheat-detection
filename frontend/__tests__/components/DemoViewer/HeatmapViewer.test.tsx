import { fireEvent, render, screen } from '@testing-library/react'
import { HeatmapViewer } from '@/components/DemoViewer/HeatmapViewer'

describe('HeatmapViewer', () => {
  it('builds heatmap image and download URLs from filters', () => {
    render(
      <HeatmapViewer
        demoId="demo-1"
        players={[{ steam_id: 'p1', name: 'Player One', team: 'CT', x: 0, y: 0 }]}
        rounds={[{ round_number: 1, start_tick: 1, end_tick: 2, winner: 'CT', end_reason: null, duration_ms: 1, kills: 0, first_kill_tick: null, bomb_planted: false }]}
      />
    )

    fireEvent.click(screen.getByText('Grenades'))
    fireEvent.change(screen.getByLabelText('Heatmap player filter'), { target: { value: 'p1' } })

    const image = document.querySelector('img') as HTMLImageElement
    expect(image.src).toContain('/demos/demo-1/heatmap')
    expect(image.src).toContain('type=grenades')
    expect(image.src).toContain('player=p1')
    expect(screen.getByText('Download')).toHaveAttribute('href', expect.stringContaining('type=grenades'))
  })
})
