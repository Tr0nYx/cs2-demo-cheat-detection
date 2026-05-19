import { render, screen, within } from '@testing-library/react'

import {
  MatchEmptyState,
  MatchHeader,
  MatchParticipantTable,
  MatchSectionTabs,
} from '@/components/MatchDetail'
import type { MatchParticipantDto, MatchSummaryDto } from '@/lib/types'

const summary: MatchSummaryDto = {
  demoId: 'demo-1',
  map: 'de_mirage',
  outcome: 'win',
  status: 'done',
  uploadedAt: '2026-05-19T10:00:00Z',
  processedAt: '2026-05-19T10:10:00Z',
  originalFilename: 'match.dem',
  steamMatchId: 'steam-match-1',
  hltvMatchUrl: null,
  sharecode: null,
  sourcePlatform: 'sharecode',
  score: null,
  scoreUnavailableReason: 'Score unavailable from current analysis payload',
}

const participants: MatchParticipantDto[] = [{
  steamId: '76561198000000001',
  name: 'Research Player',
  team: null,
  overallScore: 42,
  overallVerdict: 'suspicious',
  profileHref: '/players/76561198000000001',
  features: [
    { name: 'aimbot', score: 18, interpretation: 'Low review signal' },
    { name: 'recoil', score: 32, interpretation: 'Review signal' },
  ],
}, {
  steamId: '0',
  name: 'Demo aggregate',
  team: null,
  overallScore: 8,
  overallVerdict: 'clean',
  profileHref: null,
  features: [],
}]

describe('Match report components', () => {
  it('renders metadata and unavailable score state', () => {
    render(<MatchHeader summary={summary} />)

    expect(screen.getByText('de_mirage match report')).toBeInTheDocument()
    expect(screen.getByText('match.dem')).toBeInTheDocument()
    expect(screen.getByText('Score unavailable')).toBeInTheDocument()
    expect(screen.getByText('Score unavailable from current analysis payload')).toBeInTheDocument()
  })

  it('links only participants with a profile href', () => {
    render(<MatchParticipantTable participants={participants} />)

    const playerLinks = screen.getAllByRole('link', { name: /Research Player/i })
    expect(playerLinks).toHaveLength(2)
    expect(playerLinks[0]).toHaveAttribute('href', '/players/76561198000000001')
    expect(screen.getAllByText('Demo aggregate')[0].closest('a')).toBeNull()
    expect(screen.getAllByText(/review signal/i).length).toBeGreaterThan(0)
  })

  it('renders a useful empty participant state', () => {
    render(<MatchParticipantTable participants={[]} />)

    expect(screen.getByText('No participants in this payload')).toBeInTheDocument()
    expect(screen.getByText(/metadata, rounds, events, and viewer access/i)).toBeInTheDocument()
  })

  it('renders all section tabs with stable anchors', () => {
    render(<MatchSectionTabs />)

    const nav = screen.getByRole('navigation', { name: /match report sections/i })
    expect(within(nav).getByRole('link', { name: /Overview/i })).toHaveAttribute('href', '#overview')
    expect(within(nav).getByRole('link', { name: /Rounds/i })).toHaveAttribute('href', '#rounds')
    expect(within(nav).getByRole('link', { name: /Events/i })).toHaveAttribute('href', '#events')
    expect(within(nav).getByRole('link', { name: /Viewer/i })).toHaveAttribute('href', '#viewer')
  })

  it('keeps rendered component copy free of enforcement terms', () => {
    const { container } = render(
      <div>
        <MatchHeader summary={summary} />
        <MatchParticipantTable participants={participants} />
        <MatchEmptyState title="Unavailable" description="Current analysis payload does not include this match data." />
        <MatchSectionTabs />
      </div>
    )

    const text = container.textContent?.toLowerCase() ?? ''

    expect(text).not.toContain('cheater')
    expect(text).not.toContain('proof')
    expect(text).not.toContain('ban')
    expect(text).not.toContain('conviction')
  })
})
