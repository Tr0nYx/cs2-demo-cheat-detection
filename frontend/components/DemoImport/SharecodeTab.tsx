'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useImportSharecode } from '@/lib/hooks/useImportSharecode'

export function SharecodeTab() {
  const [input, setInput] = useState('')
  const mutation = useImportSharecode()

  // Parse textarea: split by newline, trim, filter empty
  const parseSharecodes = (text: string): string[] => {
    return text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  // Validate sharecode format: CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
  const isValidSharecode = (code: string): boolean => {
    const pattern = /^CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i
    return pattern.test(code.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const sharecodes = parseSharecodes(input)

    if (sharecodes.length === 0) {
      return // Form validation in UI prevents this
    }

    // Client-side validation before submit
    const invalid = sharecodes.filter(s => !isValidSharecode(s))
    if (invalid.length > 0) {
      // Server will reject, but we can warn upfront
      console.warn(`Invalid sharecodes: ${invalid.join(', ')}`)
    }

    mutation.mutate(sharecodes)

    // Clear input on success
    if (!mutation.isPending) {
      setInput('')
    }
  }

  const sharecodes = parseSharecodes(input)
  const isSubmitDisabled =
    sharecodes.length === 0 ||
    sharecodes.some(s => !isValidSharecode(s)) ||
    mutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import by Sharecode</CardTitle>
        <CardDescription>
          Paste sharecode(s) from Steam, Faceit, or ESEA. One per line.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Textarea input */}
          <div>
            <label htmlFor="sharecodes" className="block text-sm font-medium mb-2">
              Sharecodes
            </label>
            <Textarea
              id="sharecodes"
              placeholder={`CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY
CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY`}
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={6}
              disabled={mutation.isPending}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {sharecodes.length} sharecode(s) ready
              {sharecodes.length > 0 && (
                <>
                  {sharecodes.some(s => !isValidSharecode(s)) && (
                    <span className="text-red-500 font-semibold">
                      {' '}
                      — {sharecodes.filter(s => !isValidSharecode(s)).length} invalid format
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Error display */}
          {mutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {mutation.error?.message || 'Failed to submit sharecodes. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full"
          >
            {mutation.isPending ? 'Importing...' : 'Import Demos'}
          </Button>

          {/* Success message */}
          {mutation.isSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {mutation.data.queued} demo(s) queued for import.
                {mutation.data.failed > 0 && ` ${mutation.data.failed} failed (see below).`}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
