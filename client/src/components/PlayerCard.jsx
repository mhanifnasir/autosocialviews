import React, { useEffect, useState } from 'react'
import UniversalPlayer from './UniversalPlayer'

function PlayerCard({
  slotNumber,
  videoId,
  videoTitle,
  platform,
  isSelected,
  isLivePlaying = false,
  watchSeconds = 0,
  targetSeconds = 0,
  onUpdate,
  onVideoAssign,
  onVideoEnded,
  onStateChange,
  onError,
  viewOptimization
}) {
  const [hasVideo, setHasVideo] = useState(!!videoId)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    setHasVideo(!!videoId)
    if (videoId) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
  }, [videoId])

  const handlePlay = () => {
    const player = window[`player_${slotNumber}`]
    if (player?.play) {
      player.play()
    } else {
      player?.playVideo?.()
    }
  }

  const handlePause = () => {
    const player = window[`player_${slotNumber}`]
    if (player?.pause) {
      player.pause()
    } else {
      player?.pauseVideo?.()
    }
  }

  const handleToggleMute = () => {
    const player = window[`player_${slotNumber}`]
    if (!player) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (player.setMuted) {
      player.setMuted(nextMuted)
    }
  }

  const handleSpeedCycle = () => {
    const player = window[`player_${slotNumber}`]
    const speeds = [1.0, 1.25, 1.5, 2.0]
    const nextIdx = (speeds.indexOf(currentSpeed) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setCurrentSpeed(nextSpeed)
    if (player?.setPlaybackRate) {
      player.setPlaybackRate(nextSpeed)
    }
  }

  const handleSkipNext = () => {
    if (onVideoEnded && videoId) {
      onVideoEnded(slotNumber, videoId)
    }
  }

  const handleEjectSlot = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const player = window[`player_${slotNumber}`]
    try { player?.stop?.(); player?.pause?.() } catch (err) {}
    setHasVideo(false)
    if (onVideoAssign) {
      onVideoAssign(slotNumber, null)
    }
  }

  // Calculate percentage of retention target
  const progressPercent = targetSeconds > 0
    ? Math.min(100, Math.round((watchSeconds / targetSeconds) * 100))
    : 0

  return (
    <div className="w-full h-full bg-dark-secondary flex flex-col relative group select-none">
      {/* Top Info Bar overlay */}
      {hasVideo && videoId && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-2 flex items-center justify-between text-[11px] pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="font-bold text-white bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
              #{slotNumber}
            </span>
            {isLivePlaying ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Playing
              </span>
            ) : isLoading ? (
              <span className="text-amber-400 bg-amber-950/80 border border-amber-800 px-1.5 py-0.5 rounded font-medium">
                Loading
              </span>
            ) : (
              <span className="text-slate-400 bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded font-medium">
                Paused
              </span>
            )}
            <span className="text-[10px] text-blue-400 bg-blue-950/70 border border-blue-900 px-1 py-0.5 rounded">
              240p
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {targetSeconds > 0 && (
              <div className="flex items-center gap-1 text-slate-300 bg-black/60 px-2 py-0.5 rounded border border-slate-800 font-mono text-[10px]">
                <span>⏱ {watchSeconds}s / {targetSeconds}s</span>
                <span className="text-blue-400 font-semibold">({progressPercent}%)</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleEjectSlot}
              className="text-slate-400 hover:text-white hover:bg-red-600/80 px-1.5 py-0.5 rounded bg-black/60 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
              title="Eject video from this slot"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Player Container */}
      <div className="flex-1 bg-black relative overflow-hidden">
        {hasVideo && videoId ? (
          <UniversalPlayer
            videoId={videoId}
            platform={platform}
            slotNumber={slotNumber}
            viewOptimization={viewOptimization}
            onReady={() => setIsLoading(false)}
            onEnded={() => onVideoEnded?.(slotNumber, videoId)}
            onStateChange={onStateChange}
            onError={onError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-dark-tertiary flex items-center justify-center text-slate-400 mb-2 border border-slate-700">
              <span className="text-sm font-bold">#{slotNumber}</span>
            </div>
            <p className="text-xs font-semibold text-slate-300">Slot {slotNumber} Empty</p>
            <p className="text-[11px] text-slate-500 mt-1">Select video from queue to start</p>
          </div>
        )}
      </div>

      {/* Retention Progress Line */}
      {hasVideo && videoId && targetSeconds > 0 && (
        <div className="w-full bg-slate-800 h-1 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      )}

      {/* Player Controls Footer */}
      {hasVideo && videoId && (
        <div className="bg-dark-secondary border-t border-dark-tertiary px-2 py-1.5 flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1">
            <button
              className={`px-2 py-1 rounded font-medium transition-colors ${
                isLivePlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              onClick={isLivePlaying ? handlePause : handlePlay}
              title={isLivePlaying ? 'Pause video' : 'Play video'}
            >
              {isLivePlaying ? '⏸' : '▶'}
            </button>
            <button
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
              onClick={handleSkipNext}
              title="Skip to next video in queue"
            >
              ⏭ Next
            </button>
            <button
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors font-mono"
              onClick={handleSpeedCycle}
              title="Cycle playback speed"
            >
              {currentSpeed}x
            </button>
            <button
              className={`px-2 py-1 rounded transition-colors ${
                isMuted
                  ? 'bg-red-900/60 border border-red-800 text-red-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute video' : 'Mute video (1% micro-volume)'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          <button
            className="px-2 py-1 bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 rounded border border-slate-700 transition-colors cursor-pointer"
            onClick={handleEjectSlot}
            title="Eject video from slot"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default PlayerCard
