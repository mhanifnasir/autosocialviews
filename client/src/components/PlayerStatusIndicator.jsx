import React from 'react'

function PlayerStatusIndicator({ player }) {
  if (!player) return null

  return (
    <div className="absolute top-2 left-2 flex gap-2 z-10">
      {/* Playing indicator */}
      {player.is_playing && (
        <div className="flex items-center gap-1 bg-green-600 px-2 py-1 rounded text-xs font-semibold">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Playing
        </div>
      )}

      {/* Muted indicator */}
      {player.volume === 0 && (
        <div className="bg-red-600 px-2 py-1 rounded text-xs font-semibold">
          🔇 Muted
        </div>
      )}

      {/* Speed indicator if not 1.0x */}
      {player.playback_speed !== 1.0 && (
        <div className="bg-blue-600 px-2 py-1 rounded text-xs font-semibold">
          {player.playback_speed.toFixed(2)}x
        </div>
      )}
    </div>
  )
}

export default PlayerStatusIndicator
