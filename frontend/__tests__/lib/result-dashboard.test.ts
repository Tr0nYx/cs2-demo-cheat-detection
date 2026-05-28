import {
  buildResultDashboardViewModel,
  buildContextReducers,
  buildEvidenceSamples,
  buildFeatureFamilyBands,
  buildResultPlayerRows,
  explainFeatureScore,
  filterResultRows,
  isDemoLevelPlayer,
  isLinkableResultPlayer,
} from '@/lib/result-dashboard'
import type { ResultReviewFilter } from '@/lib/types'
import type { Demo, Feature, Player } from '@/lib/types'

const feature = (name: Feature['name'], overrides: Partial<Feature> = {}): Feature => ({
  name,
  score: 42,
  interpretation: 'Minor anomalies observed',
  evidence: ['Stored measurement'],
  ...overrides,
})

const player = (steamId: string, score: number, overrides: Partial<Player> = {}): Player => ({
  steamId,
  name: `Player ${steamId}`,
  overallScore: score,
  overallVerdict: score >= 67 ? 'likely_cheating' : score >= 34 ? 'suspicious' : 'clean',
  features: [feature('aimbot', { score })],
  ...overrides,
})

describe('result dashboard view model', () => {
  it('detects demo-level aggregate placeholder players', () => {
    expect(isDemoLevelPlayer('0')).toBe(true)
    expect(isDemoLevelPlayer(player('0', 90))).toBe(true)
    expect(isLinkableResultPlayer('0')).toBe(false)
    expect(isLinkableResultPlayer('76561198000000001')).toBe(true)
  })

  it('sorts real player rows by review signal and separates aggregates', () => {
    const { playerRows, aggregateRows } = buildResultPlayerRows([
      player('76561198000000001', 25),
      player('0', 100),
      player('76561198000000002', 84),
    ])

    expect(playerRows.map((row) => row.steamId)).toEqual([
      '76561198000000002',
      '76561198000000001',
    ])
    expect(aggregateRows).toHaveLength(1)
    expect(aggregateRows[0].profileHref).toBeNull()
  })

  it('returns no-player state for completed demos without player results', () => {
    const demo: Demo = {
      id: 'demo-1',
      status: 'done',
      results: {
        overall_score: 0,
        overall_verdict: 'clean',
        players: [],
      },
    }

    expect(buildResultDashboardViewModel(demo).emptyState).toBe('no_players')
  })

  it('returns aggregate-only state without real player attribution', () => {
    const demo: Demo = {
      id: 'demo-1',
      status: 'done',
      results: {
        overall_score: 95,
        overall_verdict: 'likely_cheating',
        players: [player('0', 95)],
      },
    }

    const model = buildResultDashboardViewModel(demo)
    expect(model.hasOnlyAggregate).toBe(true)
    expect(model.emptyState).toBe('aggregate_only')
    expect(model.playerRows).toHaveLength(0)
    expect(model.aggregateRows).toHaveLength(1)
  })

  it('adds Phase 26 coverage counts without changing player attribution', () => {
    const demo: Demo = {
      id: 'demo-1',
      status: 'done',
      results: {
        overall_score: 95,
        overall_verdict: 'likely_cheating',
        players: [
          player('76561198000000001', 81, {
            features: [
              feature('aimbot', { score: 81, evidence: ['snap ratio stored'], evidenceStrength: 'strong' }),
              feature('triggerbot', { score: 41, scoreCapApplied: true, scoreCapReason: 'Capped due to low sample count' }),
              feature('wallhack', { score: 12, evidence: [] }),
            ],
          }),
          player('0', 95, {
            features: [feature('session', { score: 95, evidence: ['aggregate variance stored'] })],
          }),
        ],
      },
    }

    const model = buildResultDashboardViewModel(demo)

    expect(model.coverageCounts).toEqual({
      realPlayers: 1,
      aggregateEntries: 1,
      reviewSignals: 1,
      limitedFeatures: 1,
      unavailableEvidence: 1,
      evidenceSamples: 3,
    })
    expect(model.aggregateRows[0].profileHref).toBeNull()
  })

  it('builds feature-family bands for all stored feature families', () => {
    const bands = buildFeatureFamilyBands([
      feature('aimbot', { score: 80 }),
      feature('triggerbot', { score: 50 }),
      feature('wallhack', { score: 40 }),
      feature('recoil', { score: 30 }),
      feature('bhop', { score: 20 }),
      feature('session', { score: 10, evidence: [] }),
    ])

    expect(bands.map((band) => band.name)).toEqual([
      'aimbot',
      'triggerbot',
      'wallhack',
      'recoil',
      'bhop',
      'session',
    ])
    expect(bands.find((band) => band.name === 'session')?.marker).toBe('unavailable')
  })

  it.each<[ResultReviewFilter, string[]]>([
    ['all', ['76561198000000002', '76561198000000001', '0']],
    ['review', ['76561198000000002']],
    ['limited', ['76561198000000001']],
    ['aggregate', ['0']],
  ])('filters result rows locally for %s', (filterName, expectedSteamIds) => {
    const { playerRows, aggregateRows } = buildResultPlayerRows([
      player('76561198000000001', 20, {
        features: [feature('aimbot', { score: 20, confidence: 'low' })],
      }),
      player('76561198000000002', 90),
      player('0', 100),
    ])

    expect(filterResultRows([...playerRows, ...aggregateRows], filterName).map((row) => row.steamId)).toEqual(expectedSteamIds)
  })

  it('builds neutral context reducers for capped, warning, weak, low, missing, and aggregate states', () => {
    const row = buildResultPlayerRows([
      player('0', 78, {
        features: [
          feature('aimbot', {
            score: 78,
            confidence: 'low',
            evidenceStrength: 'weak',
            scoreCapApplied: true,
            scoreCapReason: 'Capped due to weak corroboration',
            warning: 'Parser gap on late ticks',
            evidence: [],
          }),
        ],
      }),
    ]).aggregateRows[0]

    const reducers = buildContextReducers(row)
    const text = reducers.map((reducer) => `${reducer.label} ${reducer.description}`).join(' ')

    expect(text).toMatch(/Aggregate only/)
    expect(text).toMatch(/Limited evidence/)
    expect(text).toMatch(/Capped/)
    expect(text).toMatch(/Parser gap/)
    expect(text).toMatch(/Unavailable/)
    expect(text).not.toMatch(/Red flag|Exonerator|Trust Factor/i)
  })

  it('generates evidence samples only from stored evidence strings', () => {
    const samples = buildEvidenceSamples(feature('recoil', {
      evidence: ['spray pattern correlation stored'],
      confidence: 'medium',
      evidenceStrength: 'strong',
    }))

    expect(samples).toEqual([
      expect.objectContaining({
        featureFamily: 'recoil',
        text: 'spray pattern correlation stored',
        confidence: 'medium',
        evidenceStrength: 'strong',
      }),
    ])
    expect(samples[0]).not.toHaveProperty('round')
    expect(samples[0]).not.toHaveProperty('target')
    expect(samples[0]).not.toHaveProperty('weapon')
  })

  it('keeps capped score metadata visible in explanations', () => {
    const explanation = explainFeatureScore(feature('aimbot', {
      score: 49,
      confidence: 'medium',
      evidenceStrength: 'weak',
      scoreCapApplied: true,
      scoreCapReason: 'Capped due to weak corroboration',
      warning: 'Low sample count',
      independentSignals: ['snap_ratio'],
      method: 'aimbot_multifeature_sigmoid',
    }))

    expect(explanation.evidenceState).toBe('limited')
    expect(explanation.summary).toMatch(/calibration cap|limitation/i)
    expect(explanation.limitations.join(' ')).toMatch(/weak corroboration/i)
    expect(explanation.limitations.join(' ')).toMatch(/low sample count/i)
    expect(explanation.drivers.join(' ')).toMatch(/Snap Ratio/)
    expect(explanation.technicalDetails.join(' ')).toContain('aimbot_multifeature_sigmoid')
    expect(explanation.summary).not.toContain('aimbot_multifeature_sigmoid')
  })

  it.each<Feature['name']>([
    'aimbot',
    'triggerbot',
    'wallhack',
    'recoil',
    'bhop',
    'session',
  ])('returns plain-language explanation for %s', (name) => {
    const explanation = explainFeatureScore(feature(name, {
      score: 72,
      evidence: ['10 windows analyzed'],
    }))

    expect(explanation.summary).toMatch(/review signal/i)
    expect(explanation.drivers.length).toBeGreaterThan(0)
    expect(explanation.summary).not.toMatch(/Extractor|sigmoid|method/i)
  })

  it('marks missing feature evidence as unavailable instead of hiding it', () => {
    const explanation = explainFeatureScore(feature('triggerbot', {
      evidence: [],
      method: 'triggerbot_timing',
    }))

    expect(explanation.evidenceState).toBe('unavailable')
    expect(explanation.limitations.join(' ')).toMatch(/No supporting measurements/i)
    expect(explanation.technicalDetails.join(' ')).toContain('triggerbot_timing')
  })
})
