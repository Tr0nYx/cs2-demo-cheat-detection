'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUploadDemo } from '@/lib/hooks/useUploadDemo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, AlertCircle } from 'lucide-react'

const uploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(f => f.size <= 100_000_000, 'File must be under 100MB')
    .refine(f => f.name.endsWith('.dem'), 'File must be a .dem file'),
  steamMatchId: z.string().optional().default(''),
})

type UploadInput = z.infer<typeof uploadSchema>

interface UploadFormProps {
  onUploadSuccess?: () => void
}

export function UploadForm({ onUploadSuccess }: UploadFormProps = {}) {
  const router = useRouter()
  const uploadMutation = useUploadDemo()
  const [isDragActive, setIsDragActive] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    trigger,
  } = useForm<UploadInput>({
    resolver: zodResolver(uploadSchema) as any,
    mode: 'onChange',
  })

  const fileData = watch('file')
  const file = fileData instanceof File ? fileData : null

  const onSubmit = async (data: UploadInput) => {
    try {
      const result = await uploadMutation.mutateAsync({
        file: data.file,
        steamMatchId: data.steamMatchId || undefined,
      })
      onUploadSuccess?.()
      // Only redirect if not in a quick-upload context (no callback = landing page)
      if (!onUploadSuccess) {
        router.push(`/results/${result.id}`)
      }
    } catch (error) {
      // Error is handled by mutation state
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // Trigger validation by setting the file
      const fileInput = document.getElementById('demo-upload') as HTMLInputElement
      if (fileInput) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInput.files = dataTransfer.files
        // Trigger form validation
        await trigger('file')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Demo Upload & Analysis</CardTitle>
          <CardDescription>Upload a CS2 demo file to analyze for potential cheat signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag and drop area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <Input
              id="demo-upload"
              type="file"
              {...register('file')}
              accept=".dem"
              className="hidden"
              aria-label="Demo file upload"
            />
            <label htmlFor="demo-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="w-10 h-10 text-gray-400" />
                {file ? (
                  <div>
                    <p className="font-semibold text-sm">{file.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Drag and drop your .dem file here</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">or click to browse</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Maximum 100MB</p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* File validation errors */}
          {errors.file && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.file.message}</AlertDescription>
            </Alert>
          )}

          {/* Steam Match ID input (optional) */}
          <div className="space-y-2">
            <Label htmlFor="steam-match-id">Steam Match ID (optional)</Label>
            <Input
              id="steam-match-id"
              {...register('steamMatchId')}
              placeholder="e.g., csgo-XXXXXX-XXXXXX"
              type="text"
            />
          </div>

          {/* Upload error */}
          {uploadMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : 'Upload failed. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!file || uploadMutation.isPending}
            className="w-full"
            size="lg"
          >
            {uploadMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Uploading...
              </>
            ) : (
              'Upload Demo'
            )}
          </Button>

          {/* Helper text */}
          {file && !uploadMutation.isPending && (
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Click "Upload Demo" to start analysis. You'll be redirected to the results page where you can monitor progress.
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  )
}
