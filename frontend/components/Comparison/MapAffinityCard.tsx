'use client'

/**
 * MapAffinityCard - Displays player's top 3 maps by TRACE score.
 *
 * Shows which maps the player performs best on with:
 * - Map name display
 * - TRACE adjusted score
 * - Ranking by performance
 *
 * Props:
 * - playerName: string - Name of player for card header
 * - topMaps: Array<{map, traceAdjusted}> - Top maps by TRACE score
 */
interface MapAffinityCardProps {
  playerName: string
  topMaps: Array<{ map: string; traceAdjusted: number }>
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

export function MapAffinityCard({ playerName, topMaps }: MapAffinityCardProps) {
  const hasData = topMaps && topMaps.length > 0

  return (
    <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Map Affinity</h3>
        <p className="text-sm text-gray-600 mt-1">{playerName}</p>
      </div>

      {/* Maps list */}
      {hasData ? (
        <div className="space-y-3">
          {topMaps.map((mapData, index) => {
            const displayName = MAP_DISPLAY_NAMES[mapData.map] || mapData.map
            const medalEmoji = getMedalEmoji(index)

            return (
              <div
                key={mapData.map}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{medalEmoji}</span>
                  <div>
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{mapData.map}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {mapData.traceAdjusted.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">TRACE</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No map affinity data available</p>
      )}
    </div>
  )
}

/**
 * Get medal emoji for ranking position.
 */
function getMedalEmoji(index: number): string {
  switch (index) {
    case 0:
      return '🥇'
    case 1:
      return '🥈'
    case 2:
      return '🥉'
    default:
      return '🎯'
  }
}
