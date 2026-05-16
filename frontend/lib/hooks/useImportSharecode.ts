'use client'

import { useMutation } from '@tanstack/react-query'

interface ImportResponse {
  queued: number
  failed: number
  imports: {
    queued: Array<{
      id: string
      sharecode: string
      platform: string
      status: string
    }>
    failed: Array<{
      sharecode: string
      reason: string
      message: string
    }>
  }
}

export function useImportSharecode() {
  return useMutation<ImportResponse, Error, string[]>({
    mutationFn: async (sharecodes: string[]) => {
      const response = await fetch('/api/demos/import-sharecode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharecodes }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Import failed: ${response.status} ${error}`)
      }

      return response.json()
    },
  })
}
