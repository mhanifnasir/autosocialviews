import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'

function AdvancedPlayerControls({ sessionId, slotNumber, onStateChange }) {
  const [volume, setVolume] = useState(50)
  const [speed, setSpeed] = useState(1.0)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume)
    try {
      await api.patch(`/api/sessions/${sessionId}/players/${slotNumber}`, {
        volume: newVolume
      })
      // Update actual player volume
      const player = window[`player_${slotNumber}`]
      if (player && player.setVolume) {
        player.setVolume(newVolume)
      }
    } catch (error) {
      console.error('Error setting volume:', error)
    }
  }

  const handleSpeedChange = async (newSpeed) => {
    setSpeed(newSpeed)
    try {
      await api.patch(`/api/sessions/${sessionId}/players/${slotNumber}`, {
        playbackSpeed: newSpeed
      })
      // Update actual player speed
      const player = window[`player_${slotNumber}`]
      if (player && player.setPlaybackRate) {
        player.setPlaybackRate(newSpeed)
      }
    } catch (error) {
      console.error('Error setting playback speed:', error)
    }
  }

  return (
    <div className="bg-dark-tertiary p-3 rounded space-y-3">
      {/* Volume Control */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Volume: {volume}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="w-full h-1 bg-dark-secondary rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Speed Control */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Speed: {speed.toFixed(1)}x</label>
        <select
          value={speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="w-full px-2 py-1 bg-dark-secondary text-white text-xs rounded border border-dark-tertiary"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1.0">1.0x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="1.75">1.75x</option>
          <option value="2.0">2.0x</option>
        </select>
      </div>
    </div>
  )
}

export default AdvancedPlayerControls
