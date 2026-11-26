import React from 'react'

function BulkControls({
  onPlayAll,
  onPauseAll,
  onMuteAll,
  onUnmuteAll,
  onClearAll,
  onResetAll,
  onAutoFill,
  onOpenProxyModal
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {onAutoFill && (
        <button
          onClick={onAutoFill}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm"
          title="Auto-fill empty player slots with videos from queue"
        >
          <span>⚡</span>
          <span>Auto-Fill</span>
        </button>
      )}
      <button
        onClick={onPlayAll}
        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm"
        title="Start playback on all active slots"
      >
        <span>▶</span>
        <span>Play All</span>
      </button>
      <button
        onClick={onPauseAll}
        className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm"
        title="Pause all players"
      >
        <span>⏸</span>
        <span>Pause All</span>
      </button>
      <button
        onClick={onMuteAll}
        className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm"
        title="Set all players to 1% micro-volume (registers views without loud noise)"
      >
        <span>🔇</span>
        <span>Mute All</span>
      </button>
      <button
        onClick={onUnmuteAll}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm"
        title="Restore audible volume to 50%"
      >
        <span>🔊</span>
        <span>Unmute All</span>
      </button>
      <button
        onClick={onClearAll}
        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm"
        title="Eject all videos from player slots back to queue"
      >
        <span>♻</span>
        <span>Eject All</span>
      </button>
      {onResetAll && (
        <button
          onClick={onResetAll}
          className="bg-red-700 hover:bg-red-600 active:bg-red-800 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 shadow-sm border border-red-500/50"
          title="Reset Everything: wipe all players, clear queue links, and reset metrics to default ideal position"
        >
          <span>🔄</span>
          <span>Reset All</span>
        </button>
      )}
      {onOpenProxyModal && (
        <button
          onClick={onOpenProxyModal}
          className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded font-semibold transition-colors text-xs flex items-center gap-1 border border-purple-500 shadow-sm"
          title="Open Multi-Proxy Browser Launcher guide"
        >
          <span>🛡</span>
          <span>Proxy Launcher</span>
        </button>
      )}
    </div>
  )
}

export default BulkControls
