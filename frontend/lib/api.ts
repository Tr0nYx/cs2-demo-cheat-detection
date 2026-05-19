import axios from 'axios'
import type {
  Demo,
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
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
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

export function mapBackendDemoToFrontend(backendDemo: any): Demo {
  if (!backendDemo) return backendDemo

  const metadata = backendDemo.metadata || {}
  const backendResults = backendDemo.results || []

  // Extract overall score and verdict from results
  let maxOverallScore = 0
  let overallVerdict: 'clean' | 'suspicious' | 'likely_cheating' = 'clean'
  let modelVersion: string | undefined = undefined

  const players = backendResults.map((res: any) => {
    const rawOverall = res.scores?.overall ?? 0
    if (rawOverall > maxOverallScore) {
      maxOverallScore = rawOverall
      overallVerdict = res.label || 'clean'
    }
    if (res.model_version && !modelVersion) {
      modelVersion = res.model_version
    }

    const features: any[] = []
    if (res.scores) {
      const getInterpretation = (score: number) => {
        if (score > 75) return 'Highly suspicious activity detected'
        if (score > 35) return 'Minor anomalies observed'
        return 'Clean behavioral pattern'
      }

      features.push({ name: 'aimbot', score: res.scores.aimbot, interpretation: getInterpretation(res.scores.aimbot) })
      features.push({ name: 'triggerbot', score: res.scores.triggerbot, interpretation: getInterpretation(res.scores.triggerbot) })
      features.push({ name: 'wallhack', score: res.scores.wallhack, interpretation: getInterpretation(res.scores.wallhack) })
      features.push({ name: 'recoil', score: res.scores.recoil, interpretation: getInterpretation(res.scores.recoil) })
      features.push({ name: 'bhop', score: res.scores.bhop, interpretation: getInterpretation(res.scores.bhop) })
      features.push({ name: 'session', score: res.scores.session_consistency, interpretation: getInterpretation(res.scores.session_consistency) })
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
