'use client'

import React, { useState } from 'react'
import { UploadForm } from '@/components/UploadForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from '@/components/Console'
import { CheckCircle, UploadCloud } from 'lucide-react'

interface QuickUploadCardProps {
  onUploadSuccess?: () => void
}

export function QuickUploadCard({ onUploadSuccess }: QuickUploadCardProps) {
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSuccess = () => {
    setShowSuccess(true)
    onUploadSuccess?.()
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <UploadCloud className="size-4 text-trace-primary" aria-hidden />
            Upload demo file
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Queue a local .dem file for post-game parser analysis.</p>
        </div>
        <StatusBadge variant="import-queued" label="Manual" />
      </div>
      <div className="space-y-4">
        {showSuccess && (
          <Alert className="border-signal-clean/40 bg-signal-clean-bg text-signal-clean">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Demo queued for analysis. History refreshes after ingestion.</AlertDescription>
          </Alert>
        )}

        <UploadForm onUploadSuccess={handleSuccess} />
      </div>
    </section>
  )
}
