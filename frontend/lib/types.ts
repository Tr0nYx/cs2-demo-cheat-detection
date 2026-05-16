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
