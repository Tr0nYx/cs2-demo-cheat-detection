import axios from 'axios'
import type { Demo, AnalysisResult } from './types'

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
    if (error.response?.status === 401) {
      // Future: redirect to login if auth added
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

export default api
