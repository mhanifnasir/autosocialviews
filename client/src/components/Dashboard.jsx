import React, { useEffect, useRef, useState } from 'react'
import PlayerGrid from './PlayerGrid'
import BulkControls from './BulkControls'
import LayoutSelector from './LayoutSelector'
import QueuePanel from './QueuePanel'
import VideoImporter from './VideoImporter'
import api from '../services/api'

function Dashboard({ session }) {
  const [layout, setLayout] = useState(session?.layout_type || '2x2')
  const [players, setPlayers] = useState([])
  const [queue, setQueue] = useState([])
  const [activePlayerCount, setActivePlayerCount] = useState(session?.active_players || 4)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [viewOptimization, setViewOptimization] = useState(true)
  const [individualAdvance, setIndividualAdvance] = useState(true)
  const [minWatchTime, setMinWatchTime] = useState(35)
  const [maxWatchTime, setMaxWatchTime] = useState(90)
  const [useRetentionJitter, setUseRetentionJitter] = useState(true)
  const [isActivated, setIsActivated] = useState(false)
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(50)
  const [videosPlayedThisSession, setVideosPlayedThisSession] = useState(0)
  const [totalWatchSeconds, setTotalWatchSeconds] = useState(0)
  const [loopMode, setLoopMode] = useState('loop_queue')
  const [showProxyModal, setShowProxyModal] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('all') // 'queue' | 'import' | 'all'

  // Live state tracking
  const [livePlayingSlots, setLivePlayingSlots] = useState({})
  const [watchDurationsState, setWatchDurationsState] = useState({})
  const [watchTargetsState, setWatchTargetsState] = useState({})

  const playersRef = useRef([])
  const endedSlotsRef = useRef(new Map())
  const slotWatchDurationsRef = useRef({})
  const slotWatchTargetsRef = useRef({})
  const livePlayingSlotsRef = useRef({})
  const totalWatchSecondsRef = useRef(0)
  const advanceInProgressRef = useRef(false)
  const isClearingRef = useRef(false)

  const layoutGridMap = {
    '1x1': 1,
    '2x2': 4,
    '3x3': 9,
    '4x4': 16,
    '2x3': 6,
    '4x3': 12
  }

  useEffect(() => {
    playersRef.current = players
  }, [players])

  useEffect(() => {
    livePlayingSlotsRef.current = livePlayingSlots
  }, [livePlayingSlots])

  useEffect(() => {
    loadPlayers()
    loadQueue()
  }, [session?.id])

  const generateTargetDuration = () => {
    if (!useRetentionJitter) return 999999
    const min = Number(minWatchTime) || 35
    const max = Number(maxWatchTime) || 90
    if (min >= max) return min
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // 1-second master retention & watch duration timer
  useEffect(() => {
    if (!isActivated) return

    const interval = setInterval(() => {
      const activeLive = livePlayingSlotsRef.current
      const currentDurations = { ...slotWatchDurationsRef.current }
      const currentTargets = { ...slotWatchTargetsRef.current }
      const currentPlayers = playersRef.current || []

      let updatedAny = false
      let newSecondsAdded = 0

      currentPlayers.forEach((player) => {
        const slot = player.slot_number
        if (!player.youtube_id) {
          delete currentDurations[slot]
          delete currentTargets[slot]
          return
        }

        // Check if slot is actively playing
        if (activeLive[slot]) {
          const currentSecs = (currentDurations[slot] || 0) + 1
          currentDurations[slot] = currentSecs
          newSecondsAdded += 1
          updatedAny = true

          let target = currentTargets[slot]
          if (!target) {
            target = generateTargetDuration()
            currentTargets[slot] = target
          }

          if (currentSecs >= target) {
            console.log(`[Slot ${slot}] Retention target reached (${currentSecs}s / ${target}s). Advancing...`)
            currentDurations[slot] = 0
            currentTargets[slot] = generateTargetDuration()
            handleVideoEnded(slot, player.youtube_id)
          }
        }
      })

      if (updatedAny || newSecondsAdded > 0) {
        slotWatchDurationsRef.current = currentDurations
        slotWatchTargetsRef.current = currentTargets
        setWatchDurationsState(currentDurations)
        setWatchTargetsState(currentTargets)

        if (newSecondsAdded > 0) {
          totalWatchSecondsRef.current += newSecondsAdded
          setTotalWatchSeconds(totalWatchSecondsRef.current)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isActivated, minWatchTime, maxWatchTime, useRetentionJitter, loopMode, individualAdvance])

  useEffect(() => {
    endedSlotsRef.current = new Map()
    advanceInProgressRef.current = false
  }, [session?.id, activePlayerCount])

  const loadPlayers = async () => {
    try {
      const response = await api.get(`/sessions/${session?.id}/players`)
      const list = Array.isArray(response.data) ? response.data : []
      setPlayers(list)
      playersRef.current = list
    } catch (error) {
      console.error('Error loading players:', error)
      setPlayers([])
      playersRef.current = []
    }
  }

  const loadQueue = async () => {
    try {
      const response = await api.get('/queue')
      const list = Array.isArray(response.data) ? response.data : []
      setQueue(list)
    } catch (error) {
      console.error('Error loading queue:', error)
      setQueue([])
    }
  }

  const handleLayoutChange = async (newLayout) => {
    setLayout(newLayout)
    const newCount = layoutGridMap[newLayout]
    setActivePlayerCount(newCount)
    try {
      await api.patch(`/sessions/${session?.id}`, {
        layout_type: newLayout,
        active_players: newCount
      })
      loadPlayers()
    } catch (error) {
      console.error('Error saving layout:', error)
    }
  }

  const findFirstEmptySlot = () => {
    for (let slot = 1; slot <= activePlayerCount; slot += 1) {
      const player = players.find((item) => item.slot_number === slot)
      if (!player || !player.video_id) {
        return slot
      }
    }
    return null
  }

  const handleAssignVideo = async (slotNumber, videoId) => {
    const targetSlot = slotNumber || findFirstEmptySlot()
    if (!targetSlot) {
      alert('No empty slots available')
      return false
    }

    if (!videoId) {
      // Eject/Remove video from target slot
      const p = window[`player_${targetSlot}`]
      try { p?.stop?.(); p?.pause?.() } catch (e) {}
      delete window[`player_${targetSlot}`]

      // Optimistically update local player state so video disappears immediately
      setPlayers((prev) => {
        const next = Array.isArray(prev)
          ? prev.map((pl) =>
              pl.slot_number === targetSlot
                ? {
                    ...pl,
                    video_id: null,
                    youtube_id: null,
                    title: null,
                    thumbnail_url: null,
                    is_playing: 0,
                    playback_position: 0
                  }
                : pl
            )
          : []
        playersRef.current = next
        return next
      })

      delete slotWatchDurationsRef.current[targetSlot]
      delete slotWatchTargetsRef.current[targetSlot]
      setWatchDurationsState({ ...slotWatchDurationsRef.current })
      setWatchTargetsState({ ...slotWatchTargetsRef.current })
      setLivePlayingSlots((prev) => ({ ...prev, [targetSlot]: false }))

      try {
        if (session?.id) {
          await api.post(`/sessions/${session.id}/players/${targetSlot}`, {
            videoId: null
          })
        }
      } catch (error) {
        console.error('Error clearing slot on server:', error)
      } finally {
        await loadPlayers()
        await loadQueue()
      }
      return true
    }

    try {
      await api.post(`/sessions/${session?.id}/players/${targetSlot}`, {
        videoId: videoId
      })
      setSelectedSlot(targetSlot)
      // Reset watch progress for this slot
      slotWatchDurationsRef.current[targetSlot] = 0
      slotWatchTargetsRef.current[targetSlot] = generateTargetDuration()
      setWatchDurationsState({ ...slotWatchDurationsRef.current })
      setWatchTargetsState({ ...slotWatchTargetsRef.current })

      await loadPlayers()
      await loadQueue()
      return true
    } catch (error) {
      console.error('Error assigning video:', error)
      return false
    }
  }

  const handleAutoFill = async () => {
    try {
      const response = await api.post('/queue/auto-fill', {
        sessionId: session?.id
      })
      await loadPlayers()
      await loadQueue()

      // Reset target durations for filled slots
      for (let s = 1; s <= activePlayerCount; s++) {
        slotWatchDurationsRef.current[s] = 0
        slotWatchTargetsRef.current[s] = generateTargetDuration()
      }
      setWatchDurationsState({ ...slotWatchDurationsRef.current })
      setWatchTargetsState({ ...slotWatchTargetsRef.current })

      if (response.data?.filledCount > 0) {
        setTimeout(() => playAllSlots(), 800)
      }
    } catch (error) {
      console.error('Error auto-filling slots:', error)
    }
  }

  const handleShuffleQueue = async () => {
    try {
      const response = await api.get('/queue/shuffle')
      setQueue(response.data)
    } catch (error) {
      console.error('Error shuffling queue:', error)
    }
  }

  const handleDeleteQueueVideo = async (videoId) => {
    // Optimistically remove from state immediately so it never flickers or re-appears
    setQueue((prev) => (Array.isArray(prev) ? prev.filter((v) => v.id !== videoId && v.youtube_id !== videoId) : []))
    try {
      await api.delete(`/queue/${videoId}`)
    } catch (error) {
      console.error('Error deleting video from queue:', error)
    } finally {
      await loadQueue()
    }
  }

  const handleClearQueue = async () => {
    try {
      setQueue([])
      await api.delete('/queue')
    } catch (error) {
      console.error('Error clearing queue:', error)
    } finally {
      loadQueue()
    }
  }

  const handlePlayerError = async (slotNumber, code, videoId) => {
    console.warn(`[Dashboard] Slot ${slotNumber} error ${code} on video ${videoId}`)
    // If video is permanently restricted from embedding or deleted/private, purge it from queue/db
    if (code === 150 || code === 101 || code === 100) {
      if (videoId) {
        handleDeleteQueueVideo(videoId)
      }
    }
  }

  const handleStateChange = (slotNumber, state) => {
    setLivePlayingSlots((prev) => {
      const isPlaying = state === 'playing'
      if (prev[slotNumber] === isPlaying) return prev
      return { ...prev, [slotNumber]: isPlaying }
    })
  }

  const playAllSlots = () => {
    const nextPlaying = {}
    for (let slot = 1; slot <= activePlayerCount; slot += 1) {
      const playerObj = (playersRef.current || []).find((p) => p.slot_number === slot)
      if (playerObj?.youtube_id) {
        nextPlaying[slot] = true
      }
      const player = window[`player_${slot}`]
      if (viewOptimization) {
        // Randomized stagger delay to avoid bot detection
        const delay = (slot - 1) * 350 + Math.floor(Math.random() * 250) + 100
        setTimeout(() => {
          if (player?.play) player.play()
          else player?.playVideo?.()
        }, delay)
      } else {
        if (player?.play) player.play()
        else player?.playVideo?.()
      }
    }
    setLivePlayingSlots((prev) => ({ ...prev, ...nextPlaying }))
  }

  const handleVideoEnded = async (slotNumber, youtubeId) => {
    // If user clicked Eject All or Reset All, abort any automatic slot advancing
    if (isClearingRef.current) {
      console.log(`[Slot ${slotNumber}] Clearing in progress, ignoring advance.`)
      return
    }

    const playersSnapshot = playersRef.current || []
    const activePlayer = playersSnapshot.find((player) => player.slot_number === slotNumber)

    if (!activePlayer || !activePlayer.youtube_id) return
    if (activePlayer.youtube_id !== youtubeId) return

    setVideosPlayedThisSession((prev) => {
      const next = prev + 1
      if (autoReloadThreshold > 0 && next >= autoReloadThreshold) {
        console.log(`Auto-reload threshold reached (${autoReloadThreshold} videos). Reloading dashboard...`)
        setTimeout(() => window.location.reload(), 2000)
      }
      return next
    })

    // If repeat single video mode
    if (loopMode === 'repeat_single') {
      slotWatchDurationsRef.current[slotNumber] = 0
      slotWatchTargetsRef.current[slotNumber] = generateTargetDuration()
      setWatchDurationsState({ ...slotWatchDurationsRef.current })
      setWatchTargetsState({ ...slotWatchTargetsRef.current })
      setTimeout(() => {
        const p = window[`player_${slotNumber}`]
        if (p?.play) p.play()
        else p?.playVideo?.()
      }, 600)
      return
    }

    if (individualAdvance) {
      try {
        const queueResponse = await api.get('/queue')
        let queueVideos = Array.isArray(queueResponse.data) ? queueResponse.data : []
        let nextVideo = null

        if (queueVideos.length > 0) {
          // Select next video from queue, excluding the video that just ended/failed if possible
          nextVideo = queueVideos.find(v => v.youtube_id !== youtubeId && v.id !== activePlayer.video_id) || queueVideos[0]
        } else if (loopMode === 'loop_queue') {
          // In loop queue mode, select a different video from library (or replay from all)
          const allRes = await api.get('/queue/shuffle?all=true')
          const allList = Array.isArray(allRes.data) ? allRes.data : []
          nextVideo = allList.find(v => v.youtube_id !== youtubeId && v.id !== activePlayer.video_id) || allList[0] || null
        }

        // Safety check: ensure user didn't initiate an Eject All while fetching next video
        if (isClearingRef.current) return

        if (nextVideo) {
          const assigned = await handleAssignVideo(slotNumber, nextVideo.id)
          if (assigned && !isClearingRef.current) {
            slotWatchDurationsRef.current[slotNumber] = 0
            slotWatchTargetsRef.current[slotNumber] = generateTargetDuration()
            setWatchDurationsState({ ...slotWatchDurationsRef.current })
            setWatchTargetsState({ ...slotWatchTargetsRef.current })

            setTimeout(() => {
              if (!isClearingRef.current) {
                const player = window[`player_${slotNumber}`]
                if (player?.play) player.play()
                else player?.playVideo?.()
              }
            }, 1000)
          }
        } else {
          // No alternative video available, clear slot so it doesn't get stuck in a reload loop
          await handleAssignVideo(slotNumber, null)
        }
      } catch (error) {
        console.error('Error cycling individual slot:', error)
      }
      return
    }

    // Batch advance fallback
    const endedSlots = endedSlotsRef.current
    if (endedSlots.get(slotNumber) === youtubeId) return
    endedSlots.set(slotNumber, youtubeId)

    const assignedPlayers = playersSnapshot.filter((player) => player.youtube_id)
    if (assignedPlayers.length === 0) return

    const endedCount = assignedPlayers.reduce((count, player) => {
      return count + (endedSlots.get(player.slot_number) === player.youtube_id ? 1 : 0)
    }, 0)

    if (endedCount !== assignedPlayers.length) return
    if (advanceInProgressRef.current) return

    advanceInProgressRef.current = true
    advanceBatch().finally(() => {
      advanceInProgressRef.current = false
    })
  }

  const advanceBatch = async () => {
    if (!session?.id) return
    try {
      let queueResponse = await api.get('/queue')
      let queueVideos = Array.isArray(queueResponse.data) ? queueResponse.data : []
      if (queueVideos.length === 0 && loopMode === 'loop_queue') {
        const shuffleRes = await api.get('/queue/shuffle')
        queueVideos = Array.isArray(shuffleRes.data) ? shuffleRes.data : []
      }

      const nextBatch = queueVideos.slice(0, activePlayerCount)
      const assignments = Array.from({ length: activePlayerCount }, (_, index) => {
        const video = nextBatch[index]
        return api.post(`/sessions/${session?.id}/players/${index + 1}`, {
          videoId: video ? video.id : null
        })
      })

      await Promise.all(assignments)
      endedSlotsRef.current = new Map()
      await loadPlayers()
      await loadQueue()

      if (nextBatch.length) {
        setTimeout(() => playAllSlots(), 1000)
      }
    } catch (error) {
      console.error('Error advancing batch:', error)
    }
  }

  const applyBulkAction = (action) => {
    for (let slot = 1; slot <= activePlayerCount; slot++) {
      const p = window[`player_${slot}`]
      if (!p) continue

      if (action === 'play') {
        if (viewOptimization) {
          const delay = (slot - 1) * 150
          setTimeout(() => {
            try {
              if (p.play) p.play()
              else p.playVideo?.()
            } catch (e) {}
          }, delay)
        } else {
          try {
            if (p.play) p.play()
            else p.playVideo?.()
          } catch (e) {}
        }
      } else if (action === 'pause') {
        try {
          if (p.pause) p.pause()
          else p.pauseVideo?.()
        } catch (e) {}
      } else if (action === 'clear') {
        try {
          if (p.stop) p.stop()
          else p.stopVideo?.()
        } catch (e) {}
      } else if (action === 'mute') {
        try {
          if (p.setMuted) p.setMuted(true)
          else p.setVolume?.(1)
        } catch (e) {}
      } else if (action === 'unmute') {
        try {
          if (p.setMuted) p.setMuted(false)
          p.setVolume?.(50)
        } catch (e) {}
      }
    }
  }

  const handlePlayAll = async () => {
    // 1. Immediately trigger playback across active slots (within synchronous user click gesture)
    applyBulkAction('play')

    // 2. Mark live state
    const nextPlaying = {}
    for (let s = 1; s <= activePlayerCount; s++) {
      const playerObj = (playersRef.current || []).find((p) => p.slot_number === s)
      if (playerObj?.youtube_id) {
        nextPlaying[s] = true
      }
    }
    setLivePlayingSlots((prev) => ({ ...prev, ...nextPlaying }))

    // 3. Notify server in background
    try {
      if (session?.id) {
        await api.post(`/sessions/${session.id}/bulk-controls`, { action: 'play' })
      }
    } catch (error) {
      console.error('Error playing all on server:', error)
    }
  }

  const handlePauseAll = async () => {
    applyBulkAction('pause')
    setLivePlayingSlots({})
    try {
      if (session?.id) {
        await api.post(`/sessions/${session.id}/bulk-controls`, { action: 'pause' })
      }
    } catch (error) {
      console.error('Error pausing all on server:', error)
    }
  }

  const handleMuteAll = async () => {
    applyBulkAction('mute')
    try {
      if (session?.id) {
        await api.post(`/sessions/${session.id}/bulk-controls`, { action: 'mute' })
      }
    } catch (error) {
      console.error('Error muting all on server:', error)
    }
  }

  const handleUnmuteAll = async () => {
    applyBulkAction('unmute')
    try {
      if (session?.id) {
        await api.post(`/sessions/${session.id}/bulk-controls`, { action: 'unmute' })
      }
    } catch (error) {
      console.error('Error unmuting all on server:', error)
    }
  }

  const handleClearAll = async () => {
    isClearingRef.current = true
    advanceInProgressRef.current = true
    endedSlotsRef.current = new Map()

    // 1. Instantly stop all player instances
    for (let slot = 1; slot <= 16; slot++) {
      const p = window[`player_${slot}`]
      try { p?.stop?.(); p?.pause?.() } catch (e) {}
    }

    // 2. Optimistic UI update: instantly empty all slots in local state so UI never hangs
    setPlayers((prev) =>
      Array.isArray(prev)
        ? prev.map((p) => ({
            ...p,
            video_id: null,
            youtube_id: null,
            title: null,
            thumbnail_url: null,
            is_playing: 0,
            playback_position: 0
          }))
        : []
    )
    playersRef.current = []

    // 3. Reset durations & live tracking
    slotWatchDurationsRef.current = {}
    slotWatchTargetsRef.current = {}
    livePlayingSlotsRef.current = {}
    setWatchDurationsState({})
    setWatchTargetsState({})
    setLivePlayingSlots({})

    // 4. Update backend database
    try {
      if (session?.id) {
        await api.post(`/sessions/${session.id}/bulk-controls`, { action: 'clear' })
      }
    } catch (error) {
      console.error('Error clearing all on server:', error)
    } finally {
      await loadPlayers()
      await loadQueue()
      setTimeout(() => {
        isClearingRef.current = false
        advanceInProgressRef.current = false
      }, 1200)
    }
  }

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      'Reset AutoViews to default state?\n\nThis will:\n• Eject all players from slots\n• Clear all queue links\n• Reset session watch duration & view counters\n• Restore default 2x2 layout'
    )
    if (!confirmed) return

    isClearingRef.current = true
    advanceInProgressRef.current = true
    endedSlotsRef.current = new Map()

    // 1. Instantly stop and unregister all running player instances
    for (let slot = 1; slot <= 16; slot++) {
      const p = window[`player_${slot}`]
      try { p?.stop?.(); p?.pause?.() } catch (e) {}
      delete window[`player_${slot}`]
    }

    // 2. Immediate optimistic state reset
    setPlayers([])
    playersRef.current = []
    setQueue([])
    livePlayingSlotsRef.current = {}
    setLivePlayingSlots({})
    slotWatchDurationsRef.current = {}
    slotWatchTargetsRef.current = {}
    setWatchDurationsState({})
    setWatchTargetsState({})
    setVideosPlayedThisSession(0)
    setTotalWatchSeconds(0)
    totalWatchSecondsRef.current = 0
    setSelectedSlot(null)
    setLayout('2x2')
    setActivePlayerCount(4)

    // 3. Clear database on backend
    try {
      if (session?.id) {
        await api.post(`/sessions/${session.id}/reset`)
      } else {
        await api.delete('/queue?all=true')
      }
    } catch (err) {
      console.warn('Backend reset API error, running fallbacks:', err)
      try { await api.post(`/sessions/${session?.id}/bulk-controls`, { action: 'clear' }) } catch (e) {}
      try { await api.delete('/queue?all=true') } catch (e) {}
    } finally {
      await loadPlayers()
      await loadQueue()
      setTimeout(() => {
        isClearingRef.current = false
        advanceInProgressRef.current = false
      }, 1200)
    }
  }

  // Format watch time as H:M:S
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const activePlayingCount = Object.values(livePlayingSlots).filter(Boolean).length

  if (!isActivated) {
    return (
      <div className="w-full min-h-screen bg-dark flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-secondary border border-dark-tertiary rounded-xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-600 opacity-20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-600 opacity-20 rounded-full blur-3xl"></div>

          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">AutoViews</h1>
          <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mb-6">View-Booster Engine</p>
          
          <div className="bg-dark-tertiary p-4 rounded-lg text-left text-xs text-slate-300 space-y-2.5 mb-8 border border-dark-tertiary">
            <p className="font-semibold text-slate-200">🚀 View-Boosting Optimizations:</p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
              <li><strong className="text-slate-300">Ultra-Low 240p Mode:</strong> Streams up to 16 videos simultaneously with minimum bandwidth and 0 lag</li>
              <li><strong className="text-slate-300">Continuous 24/7 Queue Loop:</strong> Keeps streaming seamlessly without stopping</li>
              <li><strong className="text-slate-300">Audible Micro-Volume:</strong> Ensures YouTube audio graph verifies genuine human listening</li>
              <li><strong className="text-slate-300">Organic Jitter Guard:</strong> Randomized watch intervals (35s - 90s) prevent synthetic bot flags</li>
              <li><strong className="text-slate-300">Automatic Error Skip:</strong> Embed-restricted videos automatically skip within 3s</li>
            </ul>
          </div>

          <button
            onClick={() => setIsActivated(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Streaming Engine</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-dark flex flex-col overflow-x-auto overflow-y-auto">
      {/* Top Header */}
      <div className="bg-dark-secondary border-b border-dark-tertiary p-3 shrink-0 min-w-[960px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xl font-black text-white tracking-tight">AutoViews</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-blue-600/30 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">
                PRO
              </span>
            </div>
            <LayoutSelector layout={layout} onLayoutChange={handleLayoutChange} />
          </div>

          <BulkControls
            onPlayAll={handlePlayAll}
            onPauseAll={handlePauseAll}
            onMuteAll={handleMuteAll}
            onUnmuteAll={handleUnmuteAll}
            onClearAll={handleClearAll}
            onResetAll={handleResetAll}
            onAutoFill={handleAutoFill}
            onOpenProxyModal={() => setShowProxyModal(true)}
          />
        </div>
      </div>

      {/* Live Metrics Analytics Strip */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 shrink-0 min-w-[960px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs flex-wrap gap-3">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">👁 Views Counted:</span>
              <span className="font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                {videosPlayedThisSession}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">⏱ Total Watch Time:</span>
              <span className="font-semibold text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded font-mono">
                {formatTime(totalWatchSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">⚡ Active Streams:</span>
              <span className="font-semibold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded font-mono">
                {activePlayingCount} / {activePlayerCount}
              </span>
            </div>
          </div>

          {/* Quick Settings Toggles */}
          <div className="flex items-center gap-3 text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer bg-dark px-2.5 py-1 rounded border border-slate-700 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={viewOptimization}
                onChange={(e) => setViewOptimization(e.target.checked)}
                className="rounded bg-dark border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-medium">🚀 240p & Micro-Audio</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer bg-dark px-2.5 py-1 rounded border border-slate-700 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={individualAdvance}
                onChange={(e) => setIndividualAdvance(e.target.checked)}
                className="rounded bg-dark border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-medium">🔄 Auto-Advance</span>
            </label>
          </div>
        </div>
      </div>

      {/* Retention Settings & Guard Panel */}
      <div className="bg-dark-secondary border-b border-dark-tertiary px-4 py-2 text-xs shrink-0 min-w-[960px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              ⏱ Retention Guard (View Duration):
            </span>
            <label className="flex items-center gap-1 bg-dark px-2 py-0.5 rounded border border-slate-700">
              <span>Min:</span>
              <input
                type="number"
                value={minWatchTime}
                onChange={(e) => setMinWatchTime(Math.max(5, Number(e.target.value)))}
                className="w-10 bg-transparent text-white text-center outline-none focus:text-blue-400"
              />
              <span>s</span>
            </label>
            <label className="flex items-center gap-1 bg-dark px-2 py-0.5 rounded border border-slate-700">
              <span>Max:</span>
              <input
                type="number"
                value={maxWatchTime}
                onChange={(e) => setMaxWatchTime(Math.max(5, Number(e.target.value)))}
                className="w-10 bg-transparent text-white text-center outline-none focus:text-blue-400"
              />
              <span>s</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer bg-dark px-2 py-0.5 rounded border border-slate-700 hover:border-blue-500 transition-colors select-none">
              <input
                type="checkbox"
                checked={useRetentionJitter}
                onChange={(e) => setUseRetentionJitter(e.target.checked)}
                className="rounded bg-dark border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Organic Jitter (Anti-Detection)</span>
            </label>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <label className="flex items-center gap-1.5 bg-dark px-2 py-0.5 rounded border border-slate-700" title="Set to 0 to disable auto-reload">
              <span>Auto-Refresh after:</span>
              <input
                type="number"
                value={autoReloadThreshold}
                onChange={(e) => setAutoReloadThreshold(Math.max(0, Number(e.target.value)))}
                className="w-10 bg-transparent text-white text-center outline-none focus:text-blue-400"
              />
              <span>videos</span>
            </label>
            <span className="text-[11px] text-slate-500">
              💡 35s+ watch duration is required for YouTube view validation.
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid & Queue Workspace with Horizontal & Vertical Scrolling Support */}
      <div className="flex flex-col xl:flex-row gap-4 p-4 flex-1 w-full mx-auto min-w-[960px]" style={{ maxWidth: '1850px' }}>
        {/* Main Player Grid */}
        <div className="flex-1 min-h-[540px] min-w-0 flex flex-col">
          <PlayerGrid
            layout={layout}
            players={players}
            playerCount={activePlayerCount}
            viewOptimization={viewOptimization}
            onPlayerUpdate={loadPlayers}
            onVideoAssign={handleAssignVideo}
            onVideoEnded={handleVideoEnded}
            onStateChange={handleStateChange}
            onError={handlePlayerError}
            livePlayingSlots={livePlayingSlots}
            slotWatchDurations={watchDurationsState}
            slotWatchTargets={watchTargetsState}
            selectedSlot={selectedSlot}
            onSlotSelect={setSelectedSlot}
          />
        </div>

        {/* Sidebar: Importer & Queue with View Mode Tabs */}
        <div className="w-full xl:w-96 shrink-0 xl:sticky xl:top-4 flex flex-col min-h-[540px] max-h-[calc(100vh-140px)] bg-dark-secondary border border-dark-tertiary rounded-xl overflow-hidden shadow-xl">
          {/* Sidebar Tabs */}
          <div className="flex items-center border-b border-dark-tertiary bg-dark shrink-0 p-1 text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setSidebarTab('queue')}
              className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === 'queue'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>📋 Queue</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                sidebarTab === 'queue' ? 'bg-blue-800 text-white' : 'bg-dark-tertiary text-slate-300'
              }`}>
                {queue.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('import')}
              className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === 'import'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>📥 Add / Search</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('all')}
              className={`py-1.5 px-2.5 rounded transition-colors text-[11px] cursor-pointer ${
                sidebarTab === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
              title="Split View: Show both Queue and Video Importer"
            >
              Split View
            </button>
          </div>

          {/* Sidebar Content Area with Dedicated Vertical Scrollbar */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0">
            {(sidebarTab === 'queue' || sidebarTab === 'all') && (
              <div className={sidebarTab === 'all' ? 'min-h-[320px]' : 'h-full flex flex-col'}>
                <QueuePanel
                  queue={queue}
                  onAssignVideo={handleAssignVideo}
                  selectedSlot={selectedSlot}
                  onSlotSelect={setSelectedSlot}
                  playerCount={activePlayerCount}
                  onClearSelection={() => setSelectedSlot(null)}
                  onClearQueue={handleClearQueue}
                  onDeleteVideo={handleDeleteQueueVideo}
                  onAutoFill={handleAutoFill}
                  onShuffleQueue={handleShuffleQueue}
                  loopMode={loopMode}
                  onLoopModeChange={setLoopMode}
                />
              </div>
            )}

            {(sidebarTab === 'import' || sidebarTab === 'all') && (
              <div className={sidebarTab === 'all' ? 'border-t border-dark-tertiary pt-3' : 'h-full'}>
                <VideoImporter onQueueUpdate={loadQueue} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Proxy Profile Launcher Modal */}
      {showProxyModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-secondary border border-dark-tertiary rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <div className="flex items-center justify-between mb-4 border-b border-dark-tertiary pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡</span>
                <h3 className="text-base font-bold text-white">Multi-Proxy Browser Launcher</h3>
              </div>
              <button
                onClick={() => setShowProxyModal(false)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                To multiply views exponentially without getting flagged, launch multiple isolated Chrome instances routed through unique proxies.
              </p>

              <div className="bg-dark p-3 rounded border border-slate-800 space-y-2">
                <div className="font-semibold text-blue-400">1. Configure your proxies:</div>
                <p className="text-slate-400">
                  Edit <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">proxies.txt</code> in the repository root.
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-slate-400">
                  server: 12.34.56.78<br />
                  port: 8080<br />
                  secret: username:password
                </div>
              </div>

              <div className="bg-dark p-3 rounded border border-slate-800 space-y-2">
                <div className="font-semibold text-emerald-400">2. Launch isolated proxy browsers:</div>
                <p className="text-slate-400">Execute the launcher script in Windows PowerShell:</p>
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded font-mono text-[11px] text-emerald-300 border border-slate-800">
                  <span className="truncate">powershell -ExecutionPolicy Bypass -File .\launch_profiles.ps1</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('powershell -ExecutionPolicy Bypass -File .\\launch_profiles.ps1')
                      alert('Command copied to clipboard!')
                    }}
                    className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Each spawned profile has its own cookie jar, user-agent session, and proxy IP for independent view counting.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-dark-tertiary flex justify-end">
              <button
                onClick={() => setShowProxyModal(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
