'use client'

import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSteamContextLabel } from '@/lib/research-context'
import type { SteamPlayerProfileData } from '@/lib/hooks/usePlayerComparison'

function profileValue(profile: SteamPlayerProfileData, camel: keyof SteamPlayerProfileData, snake: keyof SteamPlayerProfileData): string | null {
  return (profile[camel] as string | null | undefined) ?? (profile[snake] as string | null | undefined) ?? null
}

export function SteamProfileSection({ profile }: { profile?: SteamPlayerProfileData | null }) {
  if (!profile) {
    return null
  }

  const personaName = profileValue(profile, 'personaName', 'persona_name')
  const avatarUrl = profileValue(profile, 'avatarUrl', 'avatar_url')
  const profileUrl = profileValue(profile, 'profileUrl', 'profile_url')
  const lastRefreshedAt = profileValue(profile, 'lastRefreshedAt', 'last_refreshed_at')
  const steamId = profileValue(profile, 'steamId', 'steam_id')
  const visibility = profileValue(profile, 'visibilityState', 'visibility_state') ?? 'unknown'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Steam profile reference</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">{getSteamContextLabel('External Steam metadata')}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {avatarUrl && (
              <Image
                src={avatarUrl}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-md border border-gray-200 object-cover dark:border-gray-800"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-950 dark:text-white">{personaName || steamId}</p>
              <p className="truncate font-mono text-xs text-gray-500">Steam ID: {steamId}</p>
              <p className="mt-1 text-xs text-gray-500">{getSteamContextLabel(`Visibility ${visibility}`)}</p>
              {lastRefreshedAt && (
                <p className="text-xs text-gray-500">
                  Refreshed {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastRefreshedAt))}
                </p>
              )}
            </div>
          </div>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-medium hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              Community profile <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
