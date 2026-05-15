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
}

// Analysis results container
export interface AnalysisResult {
  players: Player[]
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
