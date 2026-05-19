'use client'

import type { SteamPlayerProfileData } from '@/lib/hooks/usePlayerComparison'

interface PlayerSteamProfileBadgeProps {
  playerName: string
  steamId: string
  profile?: SteamPlayerProfileData | null
}

function profileValue(profile: SteamPlayerProfileData | null | undefined, camel: keyof SteamPlayerProfileData, snake: keyof SteamPlayerProfileData): string | null {
  return (profile?.[camel] as string | null | undefined) ?? (profile?.[snake] as string | null | undefined) ?? null
}

export function PlayerSteamProfileBadge({ playerName, steamId, profile }: PlayerSteamProfileBadgeProps) {
  const personaName = profileValue(profile, 'personaName', 'persona_name')
  const avatarUrl = profileValue(profile, 'avatarUrl', 'avatar_url')
  const profileUrl = profileValue(profile, 'profileUrl', 'profile_url')
  const visibilityState = profileValue(profile, 'visibilityState', 'visibility_state') ?? 'unknown'
  const lastRefreshedAt = profileValue(profile, 'lastRefreshedAt', 'last_refreshed_at')
  const displayName = personaName || playerName || steamId
  const refreshedLabel = lastRefreshedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastRefreshedAt))
    : null

  const content = (
    <div className="flex min-w-0 items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded border border-gray-200 object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-500">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xl font-semibold text-gray-900">{displayName}</p>
        <p className="truncate text-xs text-gray-500">Steam ID: {steamId}</p>
        <p className="truncate text-xs text-gray-400">
          {visibilityState}{refreshedLabel ? ` · refreshed ${refreshedLabel}` : ''}
        </p>
      </div>
    </div>
  )

  if (!profileUrl) {
    return content
  }

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded border border-transparent p-1 transition hover:border-gray-200 hover:bg-gray-50"
    >
      {content}
    </a>
  )
}
