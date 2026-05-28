import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  PlayerEvidenceDetail,
  PlayerEvidenceTable,
  ResultEmptyState,
  ResultOverviewPanel,
} from '@/components/ResultsDashboard'
import { buildResultDashboardViewModel } from '@/lib/result-dashboard'
import type { Demo, Feature, Player } from '@/lib/types'

const feature = (name: Feature['name'], score = 45, overrides: Partial<Feature> = {}): Feature => ({
  name,
  score,
  interpretation: 'Minor anomalies observed',
  evidence: ['12 windows analyzed'],
  confidence: 'medium',
  evidenceStrength: 'medium',
  ...overrides,
})

const player = (steamId: string, score: number, overrides: Partial<Player> = {}): Player => ({
  steamId,
  name: `Player ${steamId}`,
  overallScore: score,
  overallVerdict: score >= 67 ? 'likely_cheating' : score >= 34 ? 'suspicious' : 'clean',
  features: [
    feature('aimbot', score, {
      scoreCapApplied: true,
      scoreCapReason: 'Capped due to proxy-only evidence',
      warning: 'Low sample count',
      method: 'aimbot_multifeature_sigmoid',
    }),
    feature('triggerbot', 30),
  ],
  ...overrides,
})

const sixFamilyPlayer = (steamId = '76561198000000003'): Player => ({
  steamId,
  name: 'Six Family Player',
  overallScore: 76,
  overallVerdict: 'likely_cheating',
  features: [
    feature('aimbot', 76),
    feature('triggerbot', 48),
    feature('wallhack', 35),
    feature('recoil', 22),
    feature('bhop', 18),
    feature('session', 12, { evidence: [], confidence: 'low' }),
  ],
})

const demo = (players: Player[], status: Demo['status'] = 'done'): Demo => ({
  id: 'demo-123',
  status,
  map: 'de_mirage',
  results: status === 'done'
    ? {
        overall_score: players[0]?.overallScore ?? 0,
        overall_verdict: players[0]?.overallVerdict ?? 'clean',
        players,
        modelVersion: 'test-model',
      }
    : undefined,
})

describe('ResultsDashboard components', () => {
  it('renders overview summary for completed analysis', () => {
    const current = demo([player('76561198000000002', 82)])
    const model = buildResultDashboardViewModel(current)

    render(<ResultOverviewPanel demo={current} model={model} />)

    expect(screen.getByText('Review Orientation')).toBeInTheDocument()
    expect(screen.getByText('High review signal')).toBeInTheDocument()
    expect(screen.getByText('82/100')).toBeInTheDocument()
    expect(screen.getByText('Match report')).toBeInTheDocument()
    expect(screen.getByText('Real players')).toBeInTheDocument()
    expect(screen.getByText('Stored samples')).toBeInTheDocument()
  })

  it('renders pending and error empty states', () => {
    const pendingModel = buildResultDashboardViewModel(demo([], 'pending'))
    const { rerender } = render(<ResultEmptyState model={pendingModel} />)
    expect(screen.getByText(/analysis in progress/i)).toBeInTheDocument()

    rerender(<ResultEmptyState model={buildResultDashboardViewModel({
      id: 'demo-err',
      status: 'error',
      error_message: 'Parse failed',
    })} />)
    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument()
    expect(screen.getByText(/parse failed/i)).toBeInTheDocument()
  })

  it('renders ranked rows and selected row behavior', async () => {
    const model = buildResultDashboardViewModel(demo([
      player('76561198000000001', 30),
      player('76561198000000002', 90),
    ]))
    const onSelect = jest.fn()

    render(
      <PlayerEvidenceTable
        rows={model.playerRows}
        aggregateRows={model.aggregateRows}
        selectedSteamId={model.playerRows[0].steamId}
        onSelect={onSelect}
      />
    )

    expect(screen.getAllByText('Player 76561198000000002').length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByText('Player 76561198000000001')[0])
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ steamId: '76561198000000001' }))
  })

  it('links real Steam IDs but not aggregate rows', () => {
    const model = buildResultDashboardViewModel(demo([
      player('76561198000000001', 70),
      player('0', 100),
    ]))

    const { rerender } = render(
      <PlayerEvidenceTable rows={model.playerRows} aggregateRows={model.aggregateRows} selectedSteamId={null} onSelect={jest.fn()} />
    )
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/players/76561198000000001')

    rerender(<PlayerEvidenceDetail row={model.aggregateRows[0]} />)
    expect(screen.getByText(/demo-level aggregate research signal/i)).toBeInTheDocument()
    expect(screen.getByText('No player attribution')).toBeInTheDocument()
  })

  it('shows explanation-first evidence with secondary method details', () => {
    const model = buildResultDashboardViewModel(demo([player('76561198000000002', 82)]))

    render(<PlayerEvidenceDetail row={model.playerRows[0]} />)

    expect(screen.getAllByText(/why this score/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/what happened/i)).toBeInTheDocument()
    expect(screen.getByText(/what limits confidence/i)).toBeInTheDocument()
    expect(screen.getByText(/next review links/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Capped due to proxy-only evidence/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Low sample count/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Technical provenance/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Method: aimbot_multifeature_sigmoid/i)).toBeInTheDocument()
    expect(screen.getByText(/Evidence samples/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Round: Unavailable/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Target: Unavailable/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Weapon: Unavailable/i).length).toBeGreaterThan(0)
  })

  it('renders neutral context reducers and no-sample unavailable state', () => {
    const model = buildResultDashboardViewModel(demo([
      player('76561198000000002', 48, {
        features: [feature('wallhack', 48, {
          evidence: [],
          confidence: 'low',
          evidenceStrength: 'weak',
          warning: 'Parser gap on sound timeline',
        })],
      }),
    ]))

    render(<PlayerEvidenceDetail row={model.playerRows[0]} demoId="demo-123" />)

    expect(screen.getAllByText(/Limited evidence/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Parser gap on sound timeline/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/No stored evidence samples are available/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /match report/i })).toHaveAttribute('href', '/matches/demo-123')
    expect(screen.getByRole('link', { name: /player profile/i })).toHaveAttribute('href', '/players/76561198000000002')
    expect(document.body.textContent).not.toMatch(/Red flag|Exonerator|Trust Factor/i)
  })

  it('filters table rows locally and renders dense feature-family bands', async () => {
    const model = buildResultDashboardViewModel(demo([
      sixFamilyPlayer(),
      player('76561198000000004', 20, {
        features: [feature('aimbot', 20, { confidence: 'low' })],
      }),
      player('0', 99),
    ]))

    render(
      <PlayerEvidenceTable
        rows={model.playerRows}
        aggregateRows={model.aggregateRows}
        selectedSteamId={null}
        onSelect={jest.fn()}
      />
    )

    expect(screen.getAllByText('Aim behavior').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Trigger timing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Info timing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Recoil control').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Jump timing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Session consistency').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Limited').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: /capped\/limited/i }))
    expect(screen.getAllByText('Player 76561198000000004').length).toBeGreaterThan(0)
    expect(screen.queryByText('Demo-wide aggregate')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /aggregate/i }))
    expect(screen.getAllByText(/demo-wide aggregate/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument()
  })

  it('renders no-player empty state', () => {
    const model = buildResultDashboardViewModel(demo([]))

    render(<ResultEmptyState model={model} />)

    expect(screen.getByText(/no player rows found/i)).toBeInTheDocument()
  })
})
