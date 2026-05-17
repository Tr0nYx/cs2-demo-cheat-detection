import axios from 'axios'
import type {
  Demo,
  DemoEventsResponseDto,
  DemoRoundsResponseDto,
  DemoTicksResponseDto,
  HeatmapType,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

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

// API endpoints for demos
export const fetchDemoStatus = (id: string): Promise<Demo> =>
  api.get(`/demos/${id}`).then((r) => r.data)

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
    .then((r) => r.data)
}

export const fetchDemoList = (
  page = 1,
  limit = 20
): Promise<{ demos: Demo[]; total: number }> =>
  api.get('/demos', { params: { page, limit } }).then((r) => r.data)

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
