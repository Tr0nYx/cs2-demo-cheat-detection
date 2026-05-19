'use client'

import React from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, ExternalLink } from 'lucide-react'
import { isLinkableSteamId } from '@/lib/match-detail'

export function UserProfile() {
  const { data: session } = useSession()

  if (!session?.user) {
    return null
  }

  const user = session.user
  const candidateSteamId = user.steamId ?? user.id
  const hasSteamProfile = isLinkableSteamId(candidateSteamId)
  const steamId = candidateSteamId || 'Unknown'
  const steamProfileUrl = hasSteamProfile ? `https://steamcommunity.com/profiles/${steamId}` : null
  const idLabel = hasSteamProfile ? 'Steam ID' : 'Account ID'

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-start">
          {/* Avatar */}
          {user.image && (
            <img
              src={user.image}
              alt={user.name || 'User Avatar'}
              className="w-24 h-24 rounded-lg object-cover border border-gray-700"
            />
          )}

          {/* User Info */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm text-gray-400">Username</p>
              <p className="text-lg font-semibold text-white">{user.name || 'Unknown'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">{idLabel}</p>
              <p className="font-mono text-sm text-gray-300">{steamId}</p>
            </div>

            {user.email && (
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-sm text-gray-300">{user.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-700">
          {steamProfileUrl ? (
            <a
              href={steamProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Steam Profile
            </a>
          ) : null}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
