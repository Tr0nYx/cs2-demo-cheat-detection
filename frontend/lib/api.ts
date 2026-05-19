import axios from 'axios'
import type {
  Demo,
  Feature,
  AnalysisResult,
  DemoEventsResponseDto,
  DemoRoundsResponseDto,
  DemoTicksResponseDto,
  HeatmapType,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

type BackendFeaturePayload = {
  error?: unknown
  raw_measurements?: Record<string, unknown>
  metadata?: {
    method?: unknown
  }
}

type BackendResult = {
  player?: {
    steam_id?: string
    display_name?: string | null
  }
  scores?: Partial<Record<'aimbot' | 'triggerbot' | 'wallhack' | 'recoil' | 'bhop' | 'session_consistency' | 'overall', number>>
  label?: 'clean' | 'suspicious' | 'likely_cheating'
  model_version?: string
  feature_data?: Record<string, BackendFeaturePayload>
}

type BackendDemo = {
  demo_id?: string
  id?: string
  status?: Demo['status']
  results?: BackendResult[]
  metadata?: Record<string, string | null | undefined>
  error_message?: string
  updated_at?: string
  created_at?: string
  file_path?: string
  original_filename?: string
  map?: string | null
}

type SentryWindow = Window & {
  Sentry?: {
    captureException: (error: unknown, context?: Record<string, unknown>) => void
  }
}

function formatMetric(value: unknown, digits = 2): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })
}

function formatPercent(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a'
  return `${Math.round(value * 100)}%`
}

function featurePayload(featureData: BackendResult['feature_data'], extractorName: string): BackendFeaturePayload {
  return featureData?.[extractorName] || {}
}

function featureEvidence(featureName: Feature['name'], featureData: BackendResult['feature_data']): { evidence: string[]; method?: string; warning?: string } {
  const extractorByFeature: Record<string, string> = {
    aimbot: 'AimbotExtractor',
    triggerbot: 'TriggerbotExtractor',
    wallhack: 'WallhackExtractor',
    recoil: 'RecoilExtractor',
    bhop: 'BhopExtractor',
    session: 'SessionConsistencyExtractor',
  }
  const payload = featurePayload(featureData, extractorByFeature[featureName])
  const raw = payload.raw_measurements || {}
  const method = typeof payload.metadata?.method === 'string' ? payload.metadata.method : undefined

  if (payload.error) {
    return {
      evidence: [],
      method,
      warning: String(payload.error),
    }
  }

  if (featureName === 'aimbot') {
    return {
      method,
      evidence: [
        `${formatMetric(raw.kills_detected, 0)} kills analyzed`,
        `Mean snap ratio ${formatMetric(raw.mean_snap_ratio)}`,
        `Normalized snap ${formatPercent(raw.normalized_snap)}`,
        `Angular jerk signal ${formatPercent(raw.normalized_jerk)}`,
      ],
    }
  }

  if (featureName === 'triggerbot') {
    return {
      method,
      evidence: [
        `${formatMetric(raw.reactions_count, 0)} reactions analyzed`,
        `Median reaction ${formatMetric(raw.median_reaction_ms, 0)} ms`,
        `Bimodality coefficient ${formatMetric(raw.bimodality_coefficient, 3)}`,
        `${formatMetric(raw.instant_kills_within_2_ticks, 0)} instant kills within 2 ticks`,
      ],
    }
  }

  if (featureName === 'wallhack') {
    return {
      method,
      evidence: [
        `${formatMetric(raw.peeks_analyzed, 0)} peeks analyzed`,
        `Pre-aim ratio ${formatPercent(raw.pre_aim_ratio)}`,
        `Sound-timeline suspicious ratio ${formatPercent(raw.sound_timeline_suspicious_ratio)}`,
        `Average crosshair delta ${formatMetric(raw.crosshair_delta_avg)} deg`,
      ],
    }
  }

  if (featureName === 'recoil') {
    return {
      method,
      evidence: [
        `${formatMetric(raw.sprays_detected, 0)} sprays detected`,
        `Mean recoil-pattern correlation ${formatMetric(raw.mean_correlation, 3)}`,
        `Consistency signal ${formatPercent(raw.consistency_normalized)}`,
        `Movement sensitivity available: ${typeof raw.movement_sensitivity === 'object' && raw.movement_sensitivity !== null && 'available' in raw.movement_sensitivity && raw.movement_sensitivity.available ? 'yes' : 'no'}`,
      ],
    }
  }

  if (featureName === 'session') {
    return {
      method,
      evidence: [
        `${formatMetric(raw.rounds_analyzed, 0)} rounds analyzed`,
        `Consistency variance ${formatMetric(raw.consistency_variance, 3)}`,
        `Consistency normalized ${formatPercent(raw.consistency_normalized)}`,
        `Warmup trend normalized ${formatPercent(raw.warmup_trend_normalized)}`,
      ],
    }
  }

  return { method, evidence: [] }
}

// Request interceptor: add any future auth headers
api.interceptors.request.use((config) => {
  // Future: add auth token if available
  // const token = getCookie('auth')
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    const status = error.response?.status

    // Log to Sentry if available
    const sentry = typeof window !== 'undefined' ? (window as SentryWindow).Sentry : undefined
    if (sentry) {
      sentry.captureException(error, {
        level: 'error',
        tags: {
          api: true,
          status: String(status),
        },
        extra: {
          url: error.config?.url,
          method: error.config?.method,
        },
      })
    }

    if (status === 401) {
      // Future: redirect to login if auth added
    } else if (status === 400) {
      // Bad request - likely validation error
      error.userMessage = 'Invalid request. ' + message
    } else if (status === 404) {
      // Not found
      error.userMessage = 'Resource not found'
    } else if (status === 413) {
      // Payload too large
      error.userMessage = 'File is too large. Maximum 100MB.'
    } else if (status === 500) {
      // Server error
      error.userMessage = 'Server error. Please try again later.'
    } else if (!status) {
      // Network error
      error.userMessage = 'Unable to reach server. Please check your connection.'
    }

    return Promise.reject(error)
  }
)

export function mapBackendDemoToFrontend(backendDemo: BackendDemo): Demo {
  if (!backendDemo) return backendDemo

  const metadata = backendDemo.metadata || {}
  const backendResults = backendDemo.results || []

  // Extract overall score and verdict from results
  let maxOverallScore = 0
  let overallVerdict: 'clean' | 'suspicious' | 'likely_cheating' = 'clean'
  let modelVersion: string | undefined = undefined

  const players = backendResults.map((res: BackendResult) => {
    const rawOverall = res.scores?.overall ?? 0
    if (rawOverall > maxOverallScore) {
      maxOverallScore = rawOverall
      overallVerdict = res.label || 'clean'
    }
    if (res.model_version && !modelVersion) {
      modelVersion = res.model_version
    }

    const features: Feature[] = []
    if (res.scores) {
      const getInterpretation = (score: number) => {
        if (score > 75) return 'Highly suspicious activity detected'
        if (score > 35) return 'Minor anomalies observed'
        return 'Clean behavioral pattern'
      }

      const addFeature = (name: Feature['name'], score: number) => {
        features.push({
          name,
          score,
          interpretation: getInterpretation(score),
          ...featureEvidence(name, res.feature_data),
        })
      }

      addFeature('aimbot', res.scores.aimbot ?? 0)
      addFeature('triggerbot', res.scores.triggerbot ?? 0)
      addFeature('wallhack', res.scores.wallhack ?? 0)
      addFeature('recoil', res.scores.recoil ?? 0)
      addFeature('bhop', res.scores.bhop ?? 0)
      addFeature('session', res.scores.session_consistency ?? 0)
    }

    return {
      steamId: res.player?.steam_id || '',
      name: res.player?.display_name || 'Unknown',
      overallScore: rawOverall,
      overallVerdict: res.label || 'clean',
      features,
      modelVersion: res.model_version,
    }
  })

  if (backendResults.length > 0 && !overallVerdict) {
    if (maxOverallScore > 70) overallVerdict = 'likely_cheating'
    else if (maxOverallScore > 35) overallVerdict = 'suspicious'
    else overallVerdict = 'clean'
  }

  const results: AnalysisResult = {
    overall_score: maxOverallScore,
    overall_verdict: overallVerdict,
    players,
    modelVersion,
  }

  return {
    id: backendDemo.demo_id || backendDemo.id || '',
    status: backendDemo.status || 'pending',
    results,
    error_message: metadata.error_message || backendDemo.error_message,
    updated_at: metadata.processed_at || metadata.uploaded_at || backendDemo.updated_at,
    created_at: metadata.uploaded_at || backendDemo.created_at,
    file_path: metadata.file_path || backendDemo.file_path,
    original_filename: metadata.original_filename || backendDemo.original_filename,
    map: backendDemo.map || 'de_dust2',
  }
}

// API endpoints for demos
export const fetchDemoStatus = (id: string): Promise<Demo> =>
  api.get(`/demos/${id}`).then((r) => mapBackendDemoToFrontend(r.data))

export const uploadDemo = (
  file: File,
  steamMatchId?: string
): Promise<Demo> => {
  const formData = new FormData()
  formData.append('file', file)
  if (steamMatchId) formData.append('steamMatchId', steamMatchId)
  return api
    .post('/demos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => mapBackendDemoToFrontend(r.data))
}

export const fetchDemoList = (
  page = 1,
  limit = 20
): Promise<{ demos: Demo[]; total: number }> =>
  api.get('/demos', { params: { page, limit } }).then((r) => ({
    demos: (r.data.demos || []).map(mapBackendDemoToFrontend),
    total: r.data.total || 0,
  }))

export const deleteDemo = (id: string): Promise<void> =>
  api.delete(`/demos/${id}`).then(() => undefined)

export const downloadDemoUrl = (id: string): string =>
  `${API_BASE_URL}/demos/${id}/download`

export interface DemoEventsParams {
  type?: 'kills' | 'grenades' | 'damage' | 'all'
  round?: number
  player?: string
}

export interface DemoTicksParams {
  fromTick?: number
  toTick?: number
  round?: number
  players?: string[]
  step?: number
}

export interface DemoHeatmapParams {
  type?: HeatmapType
  player?: string
  roundFrom?: number
  roundTo?: number
}

export const fetchDemoRounds = (demoId: string): Promise<DemoRoundsResponseDto> =>
  api.get(`/demos/${demoId}/rounds`).then((r) => r.data)

export const fetchDemoEvents = (
  demoId: string,
  params: DemoEventsParams = {}
): Promise<DemoEventsResponseDto> =>
  api
    .get(`/demos/${demoId}/events`, {
      params,
    })
    .then((r) => r.data)

export const fetchDemoTicks = (
  demoId: string,
  params: DemoTicksParams = {}
): Promise<DemoTicksResponseDto> =>
  api
    .get(`/demos/${demoId}/ticks`, {
      params: {
        from_tick: params.fromTick,
        to_tick: params.toTick,
        round: params.round,
        step: params.step,
        players: params.players,
      },
    })
    .then((r) => r.data)

export const demoHeatmapUrl = (
  demoId: string,
  params: DemoHeatmapParams = {}
): string => {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type)
  if (params.player) search.set('player', params.player)
  if (params.roundFrom !== undefined) search.set('round_from', String(params.roundFrom))
  if (params.roundTo !== undefined) search.set('round_to', String(params.roundTo))
  const query = search.toString()

  return `${API_BASE_URL}/demos/${demoId}/heatmap${query ? `?${query}` : ''}`
}

// User profile and authentication endpoints
export const fetchUserProfile = async () => {
  try {
    const response = await api.get('/auth/me')
    return response.data
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    throw error
  }
}

// Fetch user's demos with pagination and sorting
export interface DemoListResponse {
  demos: Demo[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

export const fetchUserDemos = async (
  page = 1,
  limit = 20,
  sortBy = 'date',
  sortOrder = 'desc'
): Promise<DemoListResponse> => {
  try {
    const response = await api.get('/demos', {
      params: {
        page,
        limit,
        sort: sortBy,
        order: sortOrder,
      },
    })
    return {
      demos: (response.data.demos || []).map(mapBackendDemoToFrontend),
      pagination: response.data.pagination || {
        total: response.data.total || 0,
        page,
        limit,
        hasMore: response.data.hasMore || false,
      },
    }
  } catch (error) {
    console.error('Failed to fetch user demos:', error)
    throw error
  }
}

// Logout function
export const logout = async () => {
  try {
    const { signOut } = await import('next-auth/react')
    await signOut({ callbackUrl: '/' })
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

// Public metrics endpoint (no authentication required)
export const fetchPublicMetrics = async () => {
  try {
    const response = await api.get('/metrics/public')
    return response.data
  } catch (error) {
    console.error('Failed to fetch public metrics:', error)
    throw error
  }
}

export { api }
export default api
