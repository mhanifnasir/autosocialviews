import React from 'react'
import PlayerCard from './PlayerCard'

function PlayerGrid({
  layout,
  players,
  playerCount,
  onPlayerUpdate,
  onVideoAssign,
  onVideoEnded,
  onStateChange,
  onError,
  livePlayingSlots = {},
  slotWatchDurations = {},
  slotWatchTargets = {},
  selectedSlot,
  onSlotSelect,
  viewOptimization
}) {
  const gridClasses = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
    '4x4': 'grid-cols-4',
    '2x3': 'grid-cols-3',
    '4x3': 'grid-cols-4'
  }

  const rowClasses = {
    '1x1': 'grid-rows-1',
    '2x2': 'grid-rows-2',
    '3x3': 'grid-rows-3',
    '4x4': 'grid-rows-4',
    '2x3': 'grid-rows-2',
    '4x3': 'grid-rows-3'
  }

  const safePlayers = Array.isArray(players) ? players : []

  return (
    <div className="w-full h-full">
      <div className={`grid ${gridClasses[layout]} ${rowClasses[layout]} gap-3 h-full`}>
        {Array.from({ length: playerCount }).map((_, index) => {
          const slotNumber = index + 1
          const player = safePlayers.find(p => p.slot_number === slotNumber)
          const isSelected = selectedSlot === slotNumber

          return (
            <div
              key={slotNumber}
              className={`w-full min-h-[220px] rounded-lg overflow-hidden bg-dark-secondary border transition-colors flex flex-col ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : 'border-dark-tertiary hover:border-slate-600'
              }`}
              onClick={() => onSlotSelect(slotNumber)}
            >
              <PlayerCard
                slotNumber={slotNumber}
                videoId={player?.youtube_id}
                videoTitle={player?.title}
                platform={player?.platform}
                viewOptimization={viewOptimization}
                isSelected={isSelected}
                isLivePlaying={!!livePlayingSlots[slotNumber]}
                watchSeconds={slotWatchDurations[slotNumber] || 0}
                targetSeconds={slotWatchTargets[slotNumber] || 0}
                onUpdate={onPlayerUpdate}
                onVideoAssign={onVideoAssign}
                onVideoEnded={onVideoEnded}
                onStateChange={onStateChange}
                onError={onError}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlayerGrid
