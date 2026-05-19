'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DataValue, StatusBadge } from '@/components/Console'
import { useSteamMatchHistory, type SteamMatchHistoryStatus } from '@/lib/hooks/useSteamMatchHistory'
import { AlertTriangle, Link2, Loader2, PlugZap, ShieldCheck, Unplug } from 'lucide-react'

const statusCopy: Record<SteamMatchHistoryStatus['status'], { label: string; detail: string }> = {
  active: { label: 'Tracking active', detail: 'Discovery is scheduled for newer match sharecodes.' },
  caught_up: { label: 'Tracking caught up', detail: 'Valve did not return a newer sharecode on the last check.' },
  invalid_seed: { label: 'User action required', detail: 'Seed sharecode or launcher link does not match this account.' },
  auth_failed: { label: 'User action required', detail: 'Game authentication code was rejected by Steam.' },
  rate_limited: { label: 'Backoff active', detail: 'Valve rate limit is active; discovery will retry later.' },
  steam_unavailable: { label: 'Steam temporarily unavailable', detail: 'Discovery is paused until Steam responds again.' },
  disconnected: { label: 'Tracking disconnected', detail: 'Use manual upload or connect tracking with an authorized seed.' },
}

export function SteamMatchHistoryCard() {
  const { data, isLoading, error, connect, disconnect } = useSteamMatchHistory()
  const [steamidkey, setSteamidkey] = useState('')
  const [seed, setSeed] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    try {
      await connect.mutateAsync({ steamidkey, seed })
      setSeed('')
    } finally {
      setSteamidkey('')
    }
  }

  const status = data?.status ?? 'disconnected'
  const connected = data?.connected === true
  const seedValid = isPlausibleSeed(seed)
  const keyValid = steamidkey.trim().length > 0
  const showSeedValidation = seed.length > 0 && !seedValid
  const submitDisabled = connect.isPending || !keyValid || !seedValid
  const currentCopy = statusCopy[status]

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-raised p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <PlugZap className="h-4 w-4 text-trace-primary" aria-hidden />
            Match-history tracking
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Authorized sharecode discovery for import provenance.</p>
        </div>
        <StatusBadge variant={connected ? trackingVariant(status) : 'neutral'} label={currentCopy.label} />
      </div>

      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>Unable to load tracking state. Refresh before changing the connection.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tracking state
          </div>
        ) : connected && data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatusItem label="Status" value={currentCopy.label} />
              <StatusItem label="Known code" value={data.known_sharecode ?? 'Stored privately'} mono />
              <StatusItem label="Connected" value={formatDate(data.connected_since)} />
              <StatusItem label="Last check" value={formatDate(data.last_check_at)} />
              <StatusItem label="Next check" value={formatDate(data.next_check_at)} />
              <StatusItem label="Discovered" value={String(data.discovered_count)} />
              <StatusItem label="Queued" value={String(data.queued_count)} />
              <StatusItem label="Imported" value={String(data.imported_count)} />
            </div>

            <p className="text-sm text-muted-foreground">{currentCopy.detail}</p>

            {data.last_error && (
              <Alert className="border-signal-review/40 bg-signal-review-bg text-signal-review">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errorCopy(data.last_error.code, data.last_error.message)}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              Disconnect
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="steamidkey">Game Authentication Code</Label>
              <Input
                id="steamidkey"
                type="password"
                autoComplete="off"
                value={steamidkey}
                onChange={(event) => setSteamidkey(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used only to request Valve match-history sharecodes. It is never displayed after submission.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-seed">Seed Sharecode or Link</Label>
              <Input
                id="match-seed"
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                placeholder="CSGO-..."
                aria-invalid={showSeedValidation}
                aria-describedby="match-seed-help"
                required
              />
              <p id="match-seed-help" className={showSeedValidation ? 'text-xs text-signal-high' : 'text-xs text-muted-foreground'}>
                {showSeedValidation
                  ? 'Enter a CSGO sharecode or Steam launcher match-download link.'
                  : 'Accepted: CSGO-... sharecode or steam:// match-download link.'}
              </p>
            </div>
            {connect.error && (
              <Alert variant="destructive">
                <AlertDescription>{errorCopy('connect_failed', connect.error.message)}</AlertDescription>
              </Alert>
            )}
            {submitted && !connect.error && !connect.isPending && (
              <p className="text-xs text-muted-foreground">Submitted credential text was cleared from the form.</p>
            )}
            <Button type="submit" className="w-full" disabled={submitDisabled}>
              {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Connect
            </Button>
            <div className="flex items-start gap-2 rounded-md border border-border-subtle bg-surface-panel p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal-clean" />
              <span>Auto-discovered matches are queued as normal demo imports and remain separate from suspicion and TRACE scoring.</span>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

function StatusItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-panel p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm text-foreground">
        {mono ? <DataValue truncate>{value}</DataValue> : value}
      </div>
    </div>
  )
}

function formatDate(value: string | null): string {
  if (!value) return 'Not yet'
  return new Date(value).toLocaleString()
}

function isPlausibleSeed(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  const sharecodePattern = /CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}/i
  return sharecodePattern.test(trimmed) || /^steam:\/\/rungame\/730\/\d+\/\+csgo_download_match%20CSGO-/i.test(trimmed)
}

function trackingVariant(status: SteamMatchHistoryStatus['status']) {
  if (status === 'caught_up') return 'tracking-caught-up'
  if (status === 'active') return 'tracking-active'
  if (status === 'disconnected') return 'neutral'
  return 'demo-error'
}

function errorCopy(code: string, message: string | null): string {
  if (code.includes('invalid') || code.includes('seed')) {
    return 'Invalid seed. Check that the sharecode or launcher link belongs to the authenticated Steam account.'
  }
  if (code.includes('auth') || code.includes('403')) {
    return 'Authentication failed. Regenerate the Steam game authentication code and reconnect.'
  }
  if (code.includes('rate') || code.includes('429')) {
    return 'Backoff active. Steam rate-limited match-history discovery and the system will retry later.'
  }
  if (code.includes('steam') || code.includes('503')) {
    return 'Steam temporarily unavailable. No user action is needed unless this persists.'
  }
  return message ?? 'Tracking state needs review before discovery can continue.'
}
