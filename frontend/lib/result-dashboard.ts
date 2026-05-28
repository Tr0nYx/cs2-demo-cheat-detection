import type {
  Demo,
  Feature,
  Player,
  ResultContextReducer,
  ResultDashboardViewModel,
  ResultEvidenceState,
  ResultEvidenceSample,
  ResultFeatureFamilyBand,
  ResultFeatureBadge,
  ResultFeatureExplanation,
  ResultFeatureViewModel,
  ResultPlayerRowViewModel,
  ResultReviewFilter,
} from './types'

const FEATURE_LABELS: Record<Feature['name'], string> = {
  aimbot: 'Aim behavior',
  triggerbot: 'Trigger timing',
  wallhack: 'Info timing',
  recoil: 'Recoil control',
  bhop: 'Jump timing',
  session: 'Session consistency',
}

const DRIVER_HINTS: Record<Feature['name'], string[]> = {
  aimbot: ['snap ratio', 'angular velocity', 'angular jerk', 'kill-window aim movement'],
  triggerbot: ['reaction timing', 'instant kill windows', 'fire-to-hit consistency'],
  wallhack: ['pre-aim timing', 'crosshair-on-peek delta', 'sound/info timing'],
  recoil: ['spray pattern correlation', 'spray consistency', 'known weapon pattern basis'],
  bhop: ['jump-land timing', 'perfect jump ratio', 'sequence length'],
  session: ['round-to-round variance', 'consistency curve', 'warmup behavior'],
}

const confidenceRank: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const evidenceRank: Record<ResultEvidenceState, number> = {
  available: 3,
  limited: 2,
  unavailable: 1,
}

export function isDemoLevelPlayer(playerOrSteamId: Player | string | null | undefined): boolean {
  const steamId = typeof playerOrSteamId === 'string'
    ? playerOrSteamId
    : playerOrSteamId?.steamId

  if (!steamId) return true

  return steamId.trim() === '0'
}

export function isLinkableResultPlayer(playerOrSteamId: Player | string | null | undefined): boolean {
  const steamId = typeof playerOrSteamId === 'string'
    ? playerOrSteamId
    : playerOrSteamId?.steamId

  return Boolean(steamId && !isDemoLevelPlayer(steamId))
}

export function scoreBand(score: number): string {
  if (score >= 67) return 'High review signal'
  if (score >= 34) return 'Review signal'
  return 'Low review signal'
}

function verdictLabel(verdict: Player['overallVerdict'] | null | undefined): string {
  if (verdict === 'likely_cheating') return 'High review signal'
  if (verdict === 'suspicious') return 'Review signal'
  return 'Low review signal'
}

function formatEvidenceValue(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function inferEvidenceState(feature: Feature): ResultEvidenceState {
  if (feature.warning || feature.scoreCapApplied || feature.confidence === 'low' || feature.evidenceStrength === 'weak') {
    return 'limited'
  }

  if (!feature.evidence || feature.evidence.length === 0) {
    return 'unavailable'
  }

  return 'available'
}

function featureSummary(feature: Feature, state: ResultEvidenceState): string {
  const label = FEATURE_LABELS[feature.name]
  const band = scoreBand(feature.score).toLowerCase()

  if (state === 'unavailable') {
    return `${label} has a ${band}, but this analysis did not store enough supporting measurements to explain the score fully.`
  }

  if (feature.scoreCapApplied) {
    return `${label} produced a ${band}, with a calibration cap or limitation applied because the supporting evidence is not strong enough for higher confidence.`
  }

  if (feature.score >= 67) {
    return `${label} shows a high review signal based on the stored player-specific evidence for this feature family.`
  }

  if (feature.score >= 34) {
    return `${label} shows a review signal with some supporting evidence, but it should be interpreted with the confidence and limitations shown here.`
  }

  return `${label} is currently a low review signal for this player in the stored analysis.`
}

export function explainFeatureScore(feature: Feature): ResultFeatureExplanation {
  const evidenceState = inferEvidenceState(feature)
  const drivers = [
    ...(DRIVER_HINTS[feature.name] ?? []),
    ...(feature.independentSignals ?? []).map((signal) => formatEvidenceValue(signal)),
  ]
  const limitations: string[] = []
  const technicalDetails: string[] = []

  if (feature.confidence) {
    technicalDetails.push(`Confidence: ${feature.confidence}`)
    if (feature.confidence === 'low') {
      limitations.push('Low confidence reduces how strongly this score should be interpreted.')
    }
  }

  if (feature.evidenceStrength) {
    technicalDetails.push(`Evidence strength: ${feature.evidenceStrength}`)
    if (feature.evidenceStrength === 'weak') {
      limitations.push('Evidence strength is weak, so this should stay in human review context.')
    }
  }

  if (feature.scoreCapApplied) {
    limitations.push(feature.scoreCapReason || 'A calibration cap limited this score because the stored evidence was incomplete or weak.')
  }

  if (feature.warning) {
    limitations.push(feature.warning)
  }

  if (!feature.evidence || feature.evidence.length === 0) {
    limitations.push('No supporting measurements were stored for this feature.')
  } else {
    technicalDetails.push(...feature.evidence)
  }

  if (feature.method) {
    technicalDetails.push(`Method: ${feature.method}`)
  }

  return {
    summary: featureSummary(feature, evidenceState),
    drivers: Array.from(new Set(drivers)),
    limitations: Array.from(new Set(limitations)),
    technicalDetails,
    evidenceState,
  }
}

function buildFeatureViewModel(feature: Feature): ResultFeatureViewModel {
  return {
    feature,
    label: FEATURE_LABELS[feature.name],
    score: feature.score,
    bandLabel: scoreBand(feature.score),
    explanation: explainFeatureScore(feature),
  }
}

function markerForFeature(feature: Feature, state: ResultEvidenceState): ResultFeatureFamilyBand['marker'] {
  if (feature.scoreCapApplied) return 'capped'
  if (state === 'unavailable') return 'unavailable'
  if (state === 'limited') return 'limited'
  return null
}

export function buildFeatureFamilyBands(features: Feature[] = []): ResultFeatureFamilyBand[] {
  return features.map((feature) => {
    const explanation = explainFeatureScore(feature)

    return {
      name: feature.name,
      label: FEATURE_LABELS[feature.name],
      score: feature.score,
      bandLabel: scoreBand(feature.score),
      evidenceState: explanation.evidenceState,
      marker: markerForFeature(feature, explanation.evidenceState),
      topDriver: explanation.drivers[0] ?? null,
      sampleCount: feature.evidence?.length ?? 0,
    }
  })
}

export function buildEvidenceSamples(rowOrFeature: ResultPlayerRowViewModel | Feature): ResultEvidenceSample[] {
  const features = 'features' in rowOrFeature
    ? rowOrFeature.features.map((item) => item.feature)
    : [rowOrFeature]

  return features.flatMap((feature) => (
    (feature.evidence ?? []).map((text, index) => ({
      featureFamily: feature.name,
      label: `${FEATURE_LABELS[feature.name]} sample ${index + 1}`,
      text,
      evidenceStrength: feature.evidenceStrength ?? 'unavailable',
      confidence: feature.confidence ?? 'unavailable',
      sourceFeature: feature.name,
    }))
  ))
}

function reducerKey(reducer: ResultContextReducer): string {
  return `${reducer.kind}:${reducer.sourceFeature ?? 'row'}:${reducer.description}`
}

export function buildContextReducers(rowOrFeatures: ResultPlayerRowViewModel | Feature[]): ResultContextReducer[] {
  const features = Array.isArray(rowOrFeatures)
    ? rowOrFeatures
    : rowOrFeatures.features.map((item) => item.feature)
  const reducers: ResultContextReducer[] = []

  if (!Array.isArray(rowOrFeatures) && rowOrFeatures.kind === 'demo_aggregate') {
    reducers.push({
      kind: 'aggregate_only',
      label: 'Aggregate only',
      description: 'This row summarizes demo-level output and is not real player attribution.',
      severity: 'warning',
    })
  }

  if (features.length === 0) {
    reducers.push({
      kind: 'unavailable',
      label: 'Unavailable',
      description: 'No feature-family evidence was stored for this result row.',
      severity: 'warning',
    })
  }

  features.forEach((feature) => {
    const label = FEATURE_LABELS[feature.name]

    if (feature.confidence === 'low') {
      reducers.push({
        kind: 'low_confidence',
        label: 'Limited evidence',
        description: `${label} was stored with low confidence.`,
        severity: 'warning',
        sourceFeature: feature.name,
      })
    }

    if (feature.evidenceStrength === 'weak') {
      reducers.push({
        kind: 'weak_evidence',
        label: 'Limited evidence',
        description: `${label} has weak supporting evidence and needs human review context.`,
        severity: 'warning',
        sourceFeature: feature.name,
      })
    }

    if (feature.scoreCapApplied) {
      reducers.push({
        kind: 'capped',
        label: 'Capped',
        description: feature.scoreCapReason || `${label} was capped because stored evidence did not support a higher-confidence score.`,
        severity: 'info',
        sourceFeature: feature.name,
      })
    }

    if (feature.warning) {
      reducers.push({
        kind: 'parser_gap',
        label: 'Parser gap',
        description: feature.warning,
        severity: 'warning',
        sourceFeature: feature.name,
      })
    }

    if (!feature.evidence || feature.evidence.length === 0) {
      reducers.push({
        kind: 'unavailable',
        label: 'Unavailable',
        description: `${label} did not include stored supporting measurements.`,
        severity: 'warning',
        sourceFeature: feature.name,
      })
    } else if (inferEvidenceState(feature) === 'limited') {
      reducers.push({
        kind: 'limited_evidence',
        label: 'Context reducer',
        description: `${label} includes limitations that reduce confidence in this review signal.`,
        severity: 'info',
        sourceFeature: feature.name,
      })
    }
  })

  return Array.from(new Map(reducers.map((reducer) => [reducerKey(reducer), reducer])).values())
}

function topFeatureBadges(features: ResultFeatureViewModel[]): ResultFeatureBadge[] {
  return [...features]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      name: item.feature.name,
      label: item.label,
      score: item.score,
      bandLabel: item.bandLabel,
    }))
}

function rowEvidenceState(features: ResultFeatureViewModel[]): ResultEvidenceState {
  if (features.length === 0) return 'unavailable'
  if (features.some((item) => item.explanation.evidenceState === 'available')) return 'available'
  if (features.some((item) => item.explanation.evidenceState === 'limited')) return 'limited'
  return 'unavailable'
}

function rowConfidenceLabel(features: Feature[]): string {
  const confidences = features
    .map((feature) => feature.confidence)
    .filter(Boolean) as Array<NonNullable<Feature['confidence']>>

  if (confidences.length === 0) return 'Confidence unavailable'

  const strongest = confidences.sort((a, b) => confidenceRank[b] - confidenceRank[a])[0]
  return `${formatEvidenceValue(strongest)} confidence`
}

function rowEvidenceStrengthLabel(features: Feature[], state: ResultEvidenceState): string {
  const strengths = features
    .map((feature) => feature.evidenceStrength)
    .filter(Boolean) as Array<NonNullable<Feature['evidenceStrength']>>

  if (strengths.length === 0) {
    return state === 'unavailable' ? 'Evidence unavailable' : 'Evidence recorded'
  }

  const strongest = strengths.sort((a, b) => confidenceRank[b] - confidenceRank[a])[0]
  return `${formatEvidenceValue(strongest)} evidence`
}

function buildRow(player: Player): ResultPlayerRowViewModel {
  const features = (player.features ?? []).map(buildFeatureViewModel)
  const evidenceState = rowEvidenceState(features)
  const kind = isDemoLevelPlayer(player) ? 'demo_aggregate' : 'player'
  const profileHref = isLinkableResultPlayer(player) ? `/players/${player.steamId}` : null
  const partialRow = {
    kind,
    features,
  } as ResultPlayerRowViewModel

  return {
    steamId: player.steamId,
    name: kind === 'demo_aggregate' ? 'Demo-wide aggregate' : player.name || 'Unknown Player',
    kind,
    score: player.overallScore ?? 0,
    verdict: player.overallVerdict ?? 'clean',
    scoreLabel: `${Math.round(player.overallScore ?? 0)}/100`,
    statusLabel: verdictLabel(player.overallVerdict),
    confidenceLabel: rowConfidenceLabel(player.features ?? []),
    evidenceState,
    evidenceStrengthLabel: rowEvidenceStrengthLabel(player.features ?? [], evidenceState),
    topFeatureBadges: topFeatureBadges(features),
    featureFamilyBands: buildFeatureFamilyBands(player.features ?? []),
    features,
    contextReducers: buildContextReducers(partialRow),
    evidenceSamples: buildEvidenceSamples(player.features?.[0] ? { ...partialRow, features } : partialRow),
    profileHref,
    modelVersion: player.modelVersion,
    hasWarnings: features.some((item) => (
      item.feature.warning ||
      item.feature.scoreCapApplied ||
      item.explanation.evidenceState !== 'available'
    )),
    orientation: {
      identityLabel: kind === 'demo_aggregate' ? 'Demo-level aggregate entry' : player.name || player.steamId,
      profileEligible: Boolean(profileHref),
      profileHref,
      coverageSummary: `${features.length} feature families, ${buildEvidenceSamples(player.features?.[0] ? { ...partialRow, features } : partialRow).length} stored evidence samples`,
    },
  }
}

function sortRows(rows: ResultPlayerRowViewModel[]): ResultPlayerRowViewModel[] {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score

    const evidenceDelta = evidenceRank[b.evidenceState] - evidenceRank[a.evidenceState]
    if (evidenceDelta !== 0) return evidenceDelta

    return `${a.name}${a.steamId}`.localeCompare(`${b.name}${b.steamId}`)
  })
}

export function buildResultPlayerRows(players: Player[] = []): {
  playerRows: ResultPlayerRowViewModel[]
  aggregateRows: ResultPlayerRowViewModel[]
} {
  const rows = players.map(buildRow)

  return {
    playerRows: sortRows(rows.filter((row) => row.kind === 'player')),
    aggregateRows: sortRows(rows.filter((row) => row.kind === 'demo_aggregate')),
  }
}

export function filterResultRows(
  rows: ResultPlayerRowViewModel[] = [],
  filter: ResultReviewFilter = 'all'
): ResultPlayerRowViewModel[] {
  if (filter === 'review') {
    return rows.filter((row) => row.kind === 'player' && (row.score >= 34 || row.verdict !== 'clean'))
  }

  if (filter === 'limited') {
    return rows.filter((row) => row.kind === 'player' && (
      row.hasWarnings ||
      row.evidenceState !== 'available' ||
      row.contextReducers.length > 0 ||
      row.featureFamilyBands.some((band) => band.marker !== null)
    ))
  }

  if (filter === 'aggregate') {
    return rows.filter((row) => row.kind === 'demo_aggregate')
  }

  return rows
}

function coverageCounts(
  playerRows: ResultPlayerRowViewModel[],
  aggregateRows: ResultPlayerRowViewModel[]
): ResultDashboardViewModel['coverageCounts'] {
  const allRows = [...playerRows, ...aggregateRows]
  const allBands = allRows.flatMap((row) => row.featureFamilyBands)

  return {
    realPlayers: playerRows.length,
    aggregateEntries: aggregateRows.length,
    reviewSignals: playerRows.filter((row) => row.score >= 34 || row.verdict !== 'clean').length,
    limitedFeatures: allBands.filter((band) => band.marker === 'capped' || band.marker === 'limited').length,
    unavailableEvidence: allBands.filter((band) => band.evidenceState === 'unavailable').length,
    evidenceSamples: allRows.reduce((total, row) => total + row.evidenceSamples.length, 0),
  }
}

function statusLabel(demo: Demo): string {
  if (demo.status === 'pending') return 'Analyzing'
  if (demo.status === 'done') return 'Analyzed'
  if (demo.status === 'error') return 'Analysis failed'
  return 'Unknown status'
}

export function buildResultDashboardViewModel(demo: Demo): ResultDashboardViewModel {
  const results = demo.results
  const { playerRows, aggregateRows } = buildResultPlayerRows(results?.players ?? [])
  const hasResults = demo.status === 'done' && Boolean(results)
  const hasPlayers = playerRows.length > 0
  const hasOnlyAggregate = aggregateRows.length > 0 && !hasPlayers
  let emptyState: ResultDashboardViewModel['emptyState'] = null
  let message = 'Review stored player-level evidence and related analysis context.'

  if (demo.status === 'pending') {
    emptyState = 'pending'
    message = 'Analysis is still running. Evidence will appear when the parser and scoring pipeline finish.'
  } else if (demo.status === 'error') {
    emptyState = 'error'
    message = demo.error_message || 'Analysis failed before result evidence could be produced.'
  } else if (demo.status === 'done' && !results) {
    emptyState = 'no_results'
    message = 'This demo is marked analyzed, but no result payload is available.'
  } else if (demo.status === 'done' && hasOnlyAggregate) {
    emptyState = 'aggregate_only'
    message = 'Only match-wide aggregate research signals are available; no real player attribution is present.'
  } else if (demo.status === 'done' && !hasPlayers) {
    emptyState = 'no_players'
    message = 'No player-level result rows were extracted from this demo.'
  }

  const topReviewSignals = sortRows(playerRows).slice(0, 3)

  return {
    demoId: demo.id,
    status: demo.status ?? 'unknown',
    statusLabel: statusLabel(demo),
    overallScore: typeof results?.overall_score === 'number' ? results.overall_score : null,
    overallVerdict: results?.overall_verdict ?? null,
    overallStatusLabel: verdictLabel(results?.overall_verdict),
    modelVersion: results?.modelVersion ?? null,
    playerRows,
    aggregateRows,
    topReviewSignals,
    coverageCounts: coverageCounts(playerRows, aggregateRows),
    hasPlayers,
    hasOnlyAggregate,
    hasResults,
    emptyState,
    message,
  }
}
