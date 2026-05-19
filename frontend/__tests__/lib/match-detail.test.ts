import {
  buildFlaggedKills,
  buildMatchDetailViewModel,
  buildMatchParticipants,
  buildMatchSummary,
  isLinkableSteamId,
} from '@/lib/match-detail'
import type { Demo, DemoDetailDto, DemoEventsResponseDto } from '@/lib/types'

const demoStatus: Demo = {
  id: 'demo-1',
  status: 'done',
  created_at: '2026-05-19T10:00:00Z',
  updated_at: '2026-05-19T10:10:00Z',
  original_filename: 'match.dem',
  map: 'de_mirage',
  results: {
    overall_score: 42,
    overall_verdict: 'suspicious',
    players: [{
      steamId: '76561198000000001',
      name: 'Research Player',
      overallScore: 42,
      overallVerdict: 'suspicious',
      features: [{ name: 'aimbot', score: 12, interpretation: 'Low review signal' }],
    }, {
      steamId: '0',
      name: 'Demo aggregate',
      overallScore: 8,
      overallVerdict: 'clean',
      features: [],
    }],
  },
}

describe('match detail normalizers', () => {
  it('links only real Steam IDs', () => {
    expect(isLinkableSteamId('76561198000000001')).toBe(true)
    expect(isLinkableSteamId('0')).toBe(false)
    expect(isLinkableSteamId('')).toBe(false)
    expect(isLinkableSteamId(null)).toBe(false)
    expect(isLinkableSteamId('p1')).toBe(false)
    expect(isLinkableSteamId('019e3a1d-7c65-78e6-894b-4e0eaadd62ed')).toBe(false)
  })

  it('keeps score unavailable when current payload lacks score data', () => {
    const summary = buildMatchSummary(null, demoStatus)

    expect(summary.score).toBeNull()
    expect(summary.scoreUnavailableReason).toBe('Score unavailable from current analysis payload')
    expect(summary.map).toBe('de_mirage')
    expect(summary.originalFilename).toBe('match.dem')
  })

  it('reads score only when metadata explicitly provides a score model', () => {
    const detail: DemoDetailDto = {
      ...demoStatus,
      featureVectors: null,
      baselineSuspicion: null,
      metadata: {
        map: 'de_inferno',
        outcome: 'win',
        uploaded_at: '2026-05-19T10:00:00Z',
        score: { team_a: 13, team_b: 8, team_a_name: 'CT', team_b_name: 'T' },
      } as DemoDetailDto['metadata'],
    }

    expect(buildMatchSummary(detail, demoStatus).score).toEqual({
      teamA: 13,
      teamB: 8,
      teamAName: 'CT',
      teamBName: 'T',
    })
  })

  it('normalizes participants without inferring teams', () => {
    const participants = buildMatchParticipants(null, demoStatus)

    expect(participants).toHaveLength(2)
    expect(participants[0]).toMatchObject({
      steamId: '76561198000000001',
      profileHref: '/players/76561198000000001',
      team: null,
    })
    expect(participants[1].profileHref).toBeNull()
  })

  it('sorts flagged kills by tick', () => {
    const events: DemoEventsResponseDto = {
      kills: [{
        round_number: 1,
        tick: 300,
        attacker: { steam_id: 'a', name: 'A' },
        victim: { steam_id: 'b', name: 'B' },
        weapon: 'ak47',
        headshot: true,
        review_signal: { suspicion_score: 0.8, flag_reasons: ['snap'] },
      }, {
        round_number: 1,
        tick: 100,
        attacker: { steam_id: 'c', name: 'C' },
        victim: { steam_id: 'd', name: 'D' },
        weapon: 'm4a1',
        headshot: false,
        review_signal: { suspicion_score: 0.2, flag_reasons: [] },
      }, {
        round_number: 1,
        tick: 200,
        attacker: { steam_id: 'e', name: 'E' },
        victim: { steam_id: 'f', name: 'F' },
        weapon: 'awp',
        headshot: false,
        review_signal: { suspicion_score: 0.7, flag_reasons: ['reaction'] },
      }],
    }

    expect(buildFlaggedKills(events).map((event) => event.tick)).toEqual([200, 300])
  })

  it('builds availability flags from composed data', () => {
    const viewModel = buildMatchDetailViewModel({
      demoStatus,
      rounds: [{ round_number: 1, start_tick: 0, end_tick: 100, winner: null, end_reason: null, duration_ms: 5000, kills: 1, first_kill_tick: 20, bomb_planted: false }],
      events: { kills: [] },
    })

    expect(viewModel.dataAvailability).toMatchObject({
      hasScore: false,
      hasParticipants: true,
      hasRounds: true,
      hasEvents: false,
      hasFlaggedKills: false,
    })
  })
})
