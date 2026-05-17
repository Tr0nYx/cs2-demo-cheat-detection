'use client'

import React, { useState } from 'react'
import { UploadForm } from '@/components/UploadForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Quick Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSuccess && (
          <Alert className="bg-green-500/20 text-green-300 border-green-500/50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Demo uploaded successfully! Check your history below.</AlertDescription>
          </Alert>
        )}

        <UploadForm onUploadSuccess={handleSuccess} />
      </CardContent>
    </Card>
  )
}
