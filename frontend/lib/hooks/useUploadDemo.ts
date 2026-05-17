'use client'

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Demo } from '@/lib/types'

interface UploadDemoInput {
  file: File
  steamMatchId?: string
}

/**
 * Custom hook for uploading a demo file to the backend.
 * Uses React Query mutation to handle loading, error, and success states.
 * Returns the newly created demo ID on success.
 */
export function useUploadDemo() {
  return useMutation({
    mutationFn: async (input: UploadDemoInput) => {
      const formData = new FormData()
      formData.append('file', input.file)
      if (input.steamMatchId) {
        formData.append('steamMatchId', input.steamMatchId)
      }

      const response = await api.post<Demo>('/demos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    },
    onError: (error) => {
      // Error will be handled by component
      console.error('Upload failed:', error)
    },
  })
}
