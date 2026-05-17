'use client'

import Link from 'next/link'

/**
 * MatchHistoryCard - Displays demos where both players participated together.
 *
 * Shows shared gameplay history with:
 * - Demo ID/link
 * - Date of match
 * - Map played
 * - Link to demo detail page
 *
 * Props:
 * - playerName: string - Name of player for card header
 * - sharedDemos: Array<{demoId, date, mapId}> - Shared demos between players
 */
interface MatchHistoryCardProps {
  playerName: string
  sharedDemos: Array<{ demoId: string; date: string; mapId?: string }>
}

const MAP_DISPLAY_NAMES: Record<string, string> = {
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_ancient: 'Ancient',
  de_nuke: 'Nuke',
  de_dust2: 'Dust 2',
  de_overpass: 'Overpass',
  de_vertigo: 'Vertigo',
  de_anubis: 'Anubis',
}

export function MatchHistoryCard({ playerName, sharedDemos }: MatchHistoryCardProps) {
  const hasData = sharedDemos && sharedDemos.length > 0

  return (
    <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Shared Matches</h3>
        <p className="text-sm text-gray-600 mt-1">{playerName}</p>
        {hasData && (
          <p className="text-xs text-gray-500 mt-1">
            {sharedDemos.length} {sharedDemos.length === 1 ? 'match' : 'matches'}
          </p>
        )}
      </div>

      {/* Demos list */}
      {hasData ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sharedDemos.map((demo) => {
            const demoDate = new Date(demo.date)
            const displayMap =
              MAP_DISPLAY_NAMES[demo.mapId || ''] || demo.mapId || 'Unknown'

            return (
              <Link
                key={demo.demoId}
                href={`/demos/${demo.demoId}`}
                className="block p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {displayMap}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {demoDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: demoDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs font-mono text-gray-400">
                      {demo.demoId.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No shared matches found</p>
      )}
    </div>
  )
}
