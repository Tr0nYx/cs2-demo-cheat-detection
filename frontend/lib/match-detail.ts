import type {
  Demo,
  DemoDetailDto,
  DemoEventsResponseDto,
  DemoKillEventDto,
  DemoRoundDto,
  MatchDetailViewModel,
  MatchParticipantDto,
  MatchScoreDto,
  MatchSummaryDto,
} from '@/lib/types'

type MatchBuildInput = {
  demoDetail?: DemoDetailDto | null
  demoStatus?: Demo | null
  rounds?: DemoRoundDto[] | null
  events?: DemoEventsResponseDto | null
}

type UnknownRecord = Record<string, unknown>

const SCORE_UNAVAILABLE_REASON = 'Score unavailable from current analysis payload'

export function isLinkableSteamId(steamId: string | null | undefined): boolean {
  const normalized = steamId?.trim()

  return Boolean(normalized && normalized !== '0')
}

export function buildMatchSummary(
  demoDetail?: DemoDetailDto | null,
  demoStatus?: Demo | null
): MatchSummaryDto {
  const source = demoDetail ?? demoStatus
  const metadata = demoDetail?.metadata
  const score = readScore(metadata)

  return {
    demoId: source?.id ?? '',
    map: metadata?.map ?? source?.map ?? null,
    outcome: metadata?.outcome ?? null,
    status: source?.status ?? 'pending',
    uploadedAt: metadata?.uploaded_at ?? source?.created_at ?? null,
    processedAt: metadata?.processed_at ?? source?.updated_at ?? null,
    originalFilename: metadata?.original_filename ?? source?.original_filename ?? null,
    steamMatchId: metadata?.steam_match_id ?? null,
    hltvMatchUrl: metadata?.hltv_match_url ?? null,
    sharecode: metadata?.sharecode ?? null,
    sourcePlatform: metadata?.source_platform ?? null,
    score,
    scoreUnavailableReason: score ? null : SCORE_UNAVAILABLE_REASON,
  }
}

export function buildMatchParticipants(
  demoDetail?: DemoDetailDto | null,
  demoStatus?: Demo | null
): MatchParticipantDto[] {
  const players = demoDetail?.results?.players ?? demoStatus?.results?.players ?? []

  return players.map((player) => {
    const steamId = String(player.steamId ?? '')
    const explicitTeam = readPlayerTeam(player as unknown as UnknownRecord)

    return {
      steamId,
      name: player.name || (isLinkableSteamId(steamId) ? steamId : 'Demo-wide aggregate'),
      team: explicitTeam,
      overallScore: typeof player.overallScore === 'number' ? player.overallScore : null,
      overallVerdict: player.overallVerdict ?? null,
      features: player.features ?? [],
      profileHref: isLinkableSteamId(steamId) ? `/players/${steamId}` : null,
    }
  })
}

export function buildFlaggedKills(events?: DemoEventsResponseDto | null): DemoKillEventDto[] {
  return [...(events?.kills ?? [])]
    .filter((event) => (event.review_signal?.flag_reasons ?? []).length > 0)
    .sort((left, right) => left.tick - right.tick)
}

export function buildMatchDetailViewModel({
  demoDetail,
  demoStatus,
  rounds,
  events,
}: MatchBuildInput): MatchDetailViewModel {
  const safeRounds = rounds ?? []
  const safeEvents = events ?? {}
  const summary = buildMatchSummary(demoDetail, demoStatus)
  const participants = buildMatchParticipants(demoDetail, demoStatus)
  const flaggedKills = buildFlaggedKills(safeEvents)
  const eventCount =
    (safeEvents.kills?.length ?? 0) +
    (safeEvents.grenades?.length ?? 0) +
    (Array.isArray(safeEvents.damage) ? safeEvents.damage.length : 0)

  return {
    summary,
    participants,
    rounds: safeRounds,
    events: safeEvents,
    flaggedKills,
    dataAvailability: {
      hasScore: summary.score !== null,
      hasParticipants: participants.length > 0,
      hasRounds: safeRounds.length > 0,
      hasEvents: eventCount > 0,
      hasFlaggedKills: flaggedKills.length > 0,
    },
  }
}

function readScore(metadata?: DemoDetailDto['metadata']): MatchScoreDto | null {
  const candidate = (metadata as UnknownRecord | undefined)?.score

  if (!isRecord(candidate)) return null

  const teamA = readNumber(candidate.teamA ?? candidate.team_a ?? candidate.ct ?? candidate.home)
  const teamB = readNumber(candidate.teamB ?? candidate.team_b ?? candidate.t ?? candidate.away)

  if (teamA === null || teamB === null) return null

  return {
    teamA,
    teamB,
    teamAName: readString(candidate.teamAName ?? candidate.team_a_name ?? candidate.home_name),
    teamBName: readString(candidate.teamBName ?? candidate.team_b_name ?? candidate.away_name),
  }
}

function readPlayerTeam(player: UnknownRecord): string | null {
  return readString(player.team) ?? readString(player.side) ?? null
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}
