// Demo status type
export type DemoStatus = 'pending' | 'done' | 'error'

// Feature detection result
export interface Feature {
  name:
    | 'aimbot'
    | 'triggerbot'
    | 'wallhack'
    | 'recoil'
    | 'bhop'
    | 'session'
  score: number
  interpretation: string
}

// Player analysis result
export interface Player {
  steamId: string
  name: string
  overallScore: number
  overallVerdict: 'clean' | 'suspicious' | 'likely_cheating'
  features: Feature[]
  modelVersion?: string
}

// Analysis results container
export interface AnalysisResult {
  overall_score?: number
  overall_verdict?: 'clean' | 'suspicious' | 'likely_cheating'
  players: Player[]
  modelVersion?: string
}

// Demo entity with status and results
export interface Demo {
  id: string
  status: DemoStatus
  results?: AnalysisResult
  error_message?: string
  updated_at?: string
  created_at?: string
  file_path?: string
  file_size?: number
}

// TRACE component scores [0.3, 2.0] range
export interface TraceComponentDto {
  ekill: number // E-Kill rating component
  aim: number // Aim rating component
  kast: number // Keep Alive (KA/ST) rating component
  util: number // Utility usage rating component
  clutch: number // Clutch situation rating component
}

// TRACE rating result
export interface TraceDto {
  traceBase: number // Base TRACE score (float)
  traceAdjusted: number // Adjusted TRACE score (float)
  traceNormalized: number // Normalized TRACE score (float, typically [0.0, 1.0])
  trustMultiplier: number // Trust multiplier [0.73, 1.00]
  components: TraceComponentDto // Component breakdown
  calibrationVersion: string // e.g., "default-v1"
  calculatedAt: string // ISO 8601 timestamp when calculated
  createdAt: string // ISO 8601 timestamp when created
}

// TRACE error response
export interface TraceError {
  message: string
  code?: string
}

// TRACE Component Percentiles - each component ranked 0-100% against peers
export interface TraceComponentPercentilesDto {
  ekill: number | null // E-Kill percentile (0-100) or null if insufficient data
  aim: number | null // Aim percentile (0-100)
  kast: number | null // KAST percentile (0-100)
  util: number | null // Utility percentile (0-100)
  clutch: number | null // Clutch percentile (0-100)
}

// TRACE History Entry - extends TraceDto with percentile rankings
export interface TraceHistoryDto extends TraceDto {
  percentiles: TraceComponentPercentilesDto
  trustMultiplierPercentile: number | null
  traceAdjustedPercentile: number | null
}

// Pagination metadata for history endpoints
export interface PaginationMetadataDto {
  total: number // Total records available
  limit: number // Current page limit
  offset: number // Current page offset
  hasMore: boolean // Whether more records exist after current page
}

// TRACE History Collection - paginated list of history entries
export interface TraceHistoryCollectionDto {
  traces: TraceHistoryDto[]
  pagination: PaginationMetadataDto
}

export type HeatmapType = 'kills' | 'deaths' | 'damage' | 'taken' | 'grenades'

export interface DemoRoundDto {
  round_number: number
  start_tick: number
  end_tick: number
  winner: string | null
  end_reason: string | null
  duration_ms: number
  kills: number
  first_kill_tick: number | null
  bomb_planted: boolean
}

export interface DemoRoundsResponseDto {
  rounds: DemoRoundDto[]
}

export interface DemoTickPlayerDto {
  steam_id: string
  name?: string | null
  team?: string | null
  x: number
  y: number
  z?: number | null
  yaw?: number | null
  health?: number | null
  alive?: boolean
}

export interface DemoTickGrenadeDto {
  id?: string
  type: string
  x: number
  y: number
  z?: number | null
  state?: string | null
}

export interface DemoTickDto {
  tick: number
  time_ms?: number
  players: DemoTickPlayerDto[]
  grenades?: DemoTickGrenadeDto[]
}

export interface DemoTicksResponseDto {
  status: 'ready' | 'generating'
  from_tick: number
  to_tick: number
  step: number
  ticks?: DemoTickDto[]
  retryAfterSeconds?: number
}

export interface DemoKillEventDto {
  round_number: number
  tick: number
  attacker: {
    steam_id: string
    name: string | null
    position?: { x: number | null; y: number | null; z: number | null }
  }
  victim: {
    steam_id: string
    name: string | null
    position?: { x: number | null; y: number | null; z: number | null }
  }
  weapon: string | null
  headshot: boolean
  review_signal: {
    suspicion_score: number
    aimbot_score?: number
    snap_ratio?: number
    reaction_ms?: number | null
    flag_reasons: string[]
  }
}

export interface DemoGrenadeEventDto {
  round_number: number
  tick: number
  time_ms?: number
  thrower: {
    steam_id: string
    name: string | null
  }
  type: string
  start: { x: number; y: number; z: number }
  end: { x: number | null; y: number | null; z: number | null }
  end_map_px?: number | null
  end_map_py?: number | null
  trajectory: Array<{ x: number; y: number; z?: number; tick?: number }>
}

export interface DemoEventsResponseDto {
  kills?: DemoKillEventDto[]
  grenades?: DemoGrenadeEventDto[]
  damage?: unknown[]
}

export type RatingBand = '0-5' | '5-10' | '10+'
export type DemoOutcome = 'win' | 'loss' | 'draw'
export type FilterTimeframe = 7 | 30 | 90 | 999

export interface FilterCriteria {
  map?: string | null
  ratingBand?: RatingBand | null
  outcome?: DemoOutcome | null
  daysBack?: FilterTimeframe | null
  limit: number
  offset: number
}

export interface DemoSummaryDto {
  id: string
  map: string | null
  status: DemoStatus
  uploadedAt: string
  traceAdjusted: number | null
  outcome?: DemoOutcome | null
}

export interface FilteredDemosResponse {
  demos: DemoSummaryDto[]
  total: number
  hasMore: boolean
}

export interface FilterOption {
  id: string
  label: string
}

export interface FilterMetadataResponse {
  maps: string[]
  ratingBands: FilterOption[]
  outcomes: FilterOption[]
  timeframes: FilterOption[]
}

export interface FeatureThresholds {
  aimbot: number
  triggerbot: number
  wallhack: number
  recoil: number
  bhop: number
  session: number
}

export interface FeatureVectorsDto {
  aimbotScore: number
  wallhackScore: number
  triggerbotScore: number
  recoilScore: number
  bhopScore: number
  sessionScore: number
}

export interface SensitivityComparisonDto {
  baselineSuspicion: number
  tunedSuspicion: number
  impactBreakdown: Record<string, number>
}

export interface DemoDetailDto extends Demo {
  featureVectors: FeatureVectorsDto | null
  baselineSuspicion: number | null
  metadata?: {
    map?: string | null
    outcome?: DemoOutcome | null
    uploaded_at?: string
    original_filename?: string | null
  }
}
