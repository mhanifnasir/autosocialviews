import React from 'react'

function QueuePanel({
  queue = [],
  onAssignVideo,
  selectedSlot,
  onSlotSelect,
  playerCount,
  onClearSelection,
  onClearQueue,
  onDeleteVideo,
  onAutoFill,
  onShuffleQueue,
  loopMode = 'loop_queue',
  onLoopModeChange
}) {
  const safeQueue = Array.isArray(queue) ? queue : []
  const slots = Array.from({ length: playerCount || 0 }, (_, index) => index + 1)

  const handleSlotChange = (event) => {
    if (!onSlotSelect) return
    const value = event.target.value
    onSlotSelect(value ? Number(value) : null)
  }

  const handleAssign = async (videoId) => {
    const hadManualSelection = Boolean(selectedSlot)
    const assigned = await onAssignVideo(selectedSlot, videoId)
    if (assigned && hadManualSelection && onClearSelection) {
      onClearSelection()
    }
  }

  const handleDeleteItem = (event, videoId) => {
    event.stopPropagation()
    if (onDeleteVideo) {
      onDeleteVideo(videoId)
    }
  }

  return (
    <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-bold text-white">Queue</h2>
          <span className="text-[11px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded-full">
            {safeQueue.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onShuffleQueue}
            disabled={safeQueue.length < 2}
            className="px-2 py-1 text-[11px] rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
            title="Randomize video order to avoid algorithmic detection"
          >
            <span>🔀</span>
            <span>Shuffle</span>
          </button>
          <button
            type="button"
            onClick={onClearQueue}
            disabled={!safeQueue.length}
            className="px-2 py-1 text-[11px] rounded bg-red-950/60 border border-red-900 hover:bg-red-900 text-red-300 disabled:opacity-40 disabled:hover:bg-red-950/60 transition-colors"
            title="Reset and clear all links from queue"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Auto-Fill Action Banner */}
      <div className="mb-3 shrink-0">
        <button
          type="button"
          onClick={onAutoFill}
          disabled={!safeQueue.length}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>⚡ Auto-Fill All Empty Slots</span>
        </button>
      </div>

      {/* Loop Mode & Slot Assignment Row */}
      <div className="bg-dark-tertiary p-2 rounded border border-dark-tertiary mb-3 space-y-2 shrink-0 text-xs">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] text-slate-400 font-medium">🔁 Stream Mode:</span>
          <select
            value={loopMode}
            onChange={(e) => onLoopModeChange?.(e.target.value)}
            className="bg-dark text-slate-200 text-[11px] rounded px-2 py-1 border border-slate-700 outline-none focus:border-blue-500"
          >
            <option value="loop_queue">Loop Queue (24/7)</option>
            <option value="repeat_single">Repeat Video</option>
            <option value="stop">Stop at End</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-400">Target Slot:</label>
          <select
            value={selectedSlot || ''}
            onChange={handleSlotChange}
            className="flex-1 px-2 py-1 bg-dark text-white text-[11px] rounded border border-slate-700 focus:border-blue-500 outline-none"
          >
            <option value="">Auto (First empty)</option>
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                Slot #{slot}
              </option>
            ))}
          </select>
          {selectedSlot && (
            <button
              type="button"
              onClick={onClearSelection}
              className="px-1.5 py-1 text-[11px] rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Video List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
        {safeQueue.length === 0 ? (
          <div className="text-slate-500 text-center py-10 px-2">
            <p className="text-xs font-medium">No pending videos in queue</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Import from YouTube, playlists, channels, or Google above!
            </p>
          </div>
        ) : (
          safeQueue.map((video, idx) => (
            <div
              key={video.id || idx}
              className="bg-dark-tertiary p-1.5 rounded border border-slate-800 hover:border-blue-500 transition-colors cursor-pointer group flex items-center justify-between gap-2"
              onClick={() => handleAssign(video.id)}
              title="Click to assign to target slot"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-10 h-7 rounded object-cover shrink-0 bg-black"
                  />
                ) : (
                  <div className="w-10 h-7 rounded bg-slate-800 shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                    ▶
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-200 truncate group-hover:text-blue-400">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="uppercase text-slate-400 font-semibold">{video.platform || 'youtube'}</span>
                    <span>•</span>
                    <span className="truncate">{video.youtube_id}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleDeleteItem(e, video.id)}
                className="opacity-0 group-hover:opacity-100 hover:bg-red-900/60 text-slate-400 hover:text-red-300 p-1 rounded transition-opacity"
                title="Remove video from queue"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-dark-tertiary text-[10px] text-slate-500 text-center shrink-0">
        <span>Click item to assign • Auto-advances smoothly</span>
      </div>
    </div>
  )
}

export default QueuePanel
