import React, { useEffect, useRef, useState } from 'react'

let youtubeApiPromise = null
const loadYouTubeApi = () => {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    // Check interval to catch cases where script was already loaded
    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval)
        resolve(window.YT)
      }
    }, 100)

    // Safety timeout after 3s so player initialization never permanently hangs
    setTimeout(() => {
      clearInterval(checkInterval)
      resolve(window.YT || null)
    }, 3000)

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady()
      clearInterval(checkInterval)
      resolve(window.YT || null)
    }
  })
  return youtubeApiPromise
}

let facebookApiPromise = null
const loadFacebookApi = () => {
  if (facebookApiPromise) return facebookApiPromise
  facebookApiPromise = new Promise((resolve) => {
    if (window.FB) {
      resolve(window.FB)
      return
    }
    const prevInit = window.fbAsyncInit
    window.fbAsyncInit = () => {
      if (typeof prevInit === 'function') prevInit()
      window.FB.init({
        xfbml: true,
        version: 'v18.0'
      })
      resolve(window.FB)
    }

    const existingScript = document.querySelector('script[src*="connect.facebook.net"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://connect.facebook.net/en_US/sdk.js'
      tag.async = true
      tag.defer = true
      tag.crossOrigin = 'anonymous'
      document.head.appendChild(tag)
    }
  })
  return facebookApiPromise
}

function UniversalPlayer({
  videoId,
  platform = 'youtube',
  slotNumber,
  onReady,
  onEnded,
  onStateChange,
  onError,
  viewOptimization = true
}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const onReadyRef = useRef(onReady)
  const onEndedRef = useRef(onEnded)
  const onStateChangeRef = useRef(onStateChange)
  const onErrorRef = useRef(onError)
  const viewOptimizationRef = useRef(viewOptimization)

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [streamHanging, setStreamHanging] = useState(false)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    viewOptimizationRef.current = viewOptimization
  }, [viewOptimization])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setErrorMessage(null)
    setStreamHanging(false)

    // Immediate fallback adapter so slot controls (Play/Pause/Mute/Eject All) ALWAYS work immediately
    window[`player_${slotNumber}`] = {
      play: () => {
        try {
          playerRef.current?.playVideo?.()
          const iframe = containerRef.current?.querySelector('iframe')
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
          }
        } catch (e) {}
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo?.()
          const iframe = containerRef.current?.querySelector('iframe')
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
          }
        } catch (e) {}
      },
      setVolume: (vol) => {
        try { playerRef.current?.setVolume?.(vol) } catch (e) {}
      },
      setMuted: (isMuted) => {
        try { isMuted ? playerRef.current?.mute?.() : playerRef.current?.unMute?.() } catch (e) {}
      },
      setPlaybackRate: (rate) => {
        try { playerRef.current?.setPlaybackRate?.(rate) } catch (e) {}
      },
      getPlaybackRate: () => 1,
      stop: () => {
        try {
          playerRef.current?.stopVideo?.()
          const iframe = containerRef.current?.querySelector('iframe')
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*')
          }
        } catch (e) {}
      }
    }

    // Dismiss loading spinner after 2 seconds so the stream never hangs the user interface
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false)
      }
    }, 2000)

    // If stream takes more than 5s to connect, flag as slow/hanging and offer instant skip
    const hangTimeout = setTimeout(() => {
      if (isMounted) {
        setStreamHanging(true)
      }
    }, 5000)

    // Fallback: If video is completely unresponsive after 10s, flag error so user can skip
    const autoSkipTimeout = setTimeout(() => {
      if (isMounted && !errorMessage) {
        console.warn(`[Slot ${slotNumber}] Video stream unresponsive after 10s.`)
        setErrorMessage('Video connection timed out or is restricted')
        setLoading(false)
        setStreamHanging(false)
      }
    }, 10000)

    // Helper: unified adapter registry
    const registerAdapter = (adapter) => {
      if (!isMounted) return
      clearTimeout(loadingTimeout)
      clearTimeout(hangTimeout)
      clearTimeout(autoSkipTimeout)
      setLoading(false)
      setStreamHanging(false)

      window[`player_${slotNumber}`] = {
        play: () => {
          try { adapter.play() } catch (e) { console.error(e) }
        },
        pause: () => {
          try { adapter.pause() } catch (e) { console.error(e) }
        },
        setVolume: (vol) => {
          const finalVol = (vol === 0 && viewOptimizationRef.current)
            ? (Math.floor(Math.random() * 3) + 1)
            : vol
          try { adapter.setVolume(finalVol) } catch (e) { console.error(e) }
        },
        setMuted: (isMuted) => {
          if (isMuted && viewOptimizationRef.current) {
            try {
              if (adapter.setMuted) adapter.setMuted(false)
              const microVol = Math.floor(Math.random() * 3) + 1
              adapter.setVolume(microVol)
            } catch (e) { console.error(e) }
          } else {
            try { adapter.setMuted(isMuted) } catch (e) { console.error(e) }
          }
        },
        setPlaybackRate: (rate) => {
          try {
            if (adapter.setPlaybackRate) adapter.setPlaybackRate(rate)
          } catch (e) { console.error(e) }
        },
        getPlaybackRate: () => {
          try {
            return adapter.getPlaybackRate ? adapter.getPlaybackRate() : 1
          } catch (e) { return 1 }
        },
        stop: () => {
          try {
            if (adapter.stop) adapter.stop()
            else adapter.pause()
          } catch (e) { console.error(e) }
        }
      }
      onReadyRef.current?.()
    }

    const initPlayer = async () => {
      if (platform === 'youtube' || !platform) {
        await loadYouTubeApi()
        if (!isMounted || !containerRef.current) {
          clearTimeout(loadingTimeout)
          setLoading(false)
          return
        }

        try {
          if (!containerRef.current) return
          containerRef.current.innerHTML = ''
          const mountNode = document.createElement('div')
          mountNode.id = `yt-embed-${slotNumber}-${Date.now()}`
          mountNode.style.width = '100%'
          mountNode.style.height = '100%'
          containerRef.current.appendChild(mountNode)

          // Fallback direct iframe if window.YT is not available
          if (!window.YT || !window.YT.Player) {
            console.warn(`[Slot ${slotNumber}] YT API unavailable, using direct iframe fallback`)
            const iframe = document.createElement('iframe')
            iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&autoplay=0`
            iframe.style.width = '100%'
            iframe.style.height = '100%'
            iframe.style.border = 'none'
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            iframe.allowFullscreen = true
            mountNode.appendChild(iframe)

            registerAdapter({
              play: () => {
                iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
              },
              pause: () => {
                iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
              },
              setVolume: (v) => {
                iframe.contentWindow?.postMessage(`{"event":"command","func":"setVolume","args":[${v}]}`, '*')
              },
              setMuted: (m) => {
                const func = m ? 'mute' : 'unMute'
                iframe.contentWindow?.postMessage(`{"event":"command","func":"${func}","args":""}`, '*')
              },
              setPlaybackRate: (rate) => {
                iframe.contentWindow?.postMessage(`{"event":"command","func":"setPlaybackRate","args":[${rate}]}`, '*')
              },
              getPlaybackRate: () => 1,
              getCurrentTime: () => 0,
              getDuration: () => 0,
              stop: () => {
                iframe.contentWindow?.postMessage('{"event":"command","func":"stopVideo","args":""}', '*')
              }
            })
            return
          }

          playerRef.current = new window.YT.Player(mountNode, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              fs: 1,
              rel: 0,
              enablejsapi: 1,
              playsinline: 1,
              iv_load_policy: 3
            },
            events: {
              onReady: (event) => {
                const yt = event.target
                try {
                  if (yt.setPlaybackQuality) yt.setPlaybackQuality('small')
                  if (viewOptimizationRef.current) {
                    yt.mute?.()
                  }
                } catch (e) {}

                registerAdapter({
                  play: () => {
                    try {
                      if (yt.playVideo) {
                        // Ensure muted before play to satisfy browser autoplay policy
                        if (viewOptimizationRef.current && yt.mute) {
                          yt.mute()
                        }
                        yt.playVideo()
                      }
                      const iframe = containerRef.current?.querySelector('iframe')
                      if (iframe?.contentWindow) {
                        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
                      }
                    } catch (e) { console.error('YT play error:', e) }
                  },
                  pause: () => {
                    try {
                      if (yt.pauseVideo) yt.pauseVideo()
                      const iframe = containerRef.current?.querySelector('iframe')
                      if (iframe?.contentWindow) {
                        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
                      }
                    } catch (e) { console.error('YT pause error:', e) }
                  },
                  setVolume: (v) => yt.setVolume?.(v),
                  setMuted: (m) => m ? yt.mute?.() : yt.unMute?.(),
                  setPlaybackRate: (rate) => yt.setPlaybackRate?.(rate),
                  getPlaybackRate: () => yt.getPlaybackRate?.() || 1,
                  getCurrentTime: () => yt.getCurrentTime?.() || 0,
                  getDuration: () => yt.getDuration?.() || 0,
                  stop: () => {
                    try {
                      if (yt.stopVideo) yt.stopVideo()
                      else if (yt.pauseVideo) yt.pauseVideo()
                      const iframe = containerRef.current?.querySelector('iframe')
                      if (iframe?.contentWindow) {
                        iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*')
                      }
                    } catch (e) { console.error('YT stop error:', e) }
                  }
                })
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  onStateChangeRef.current?.(slotNumber, 'playing')
                  // Set micro-volume after playback starts to satisfy autoplay rules
                  if (viewOptimizationRef.current && playerRef.current) {
                    setTimeout(() => {
                      try {
                        playerRef.current?.unMute?.()
                        playerRef.current?.setVolume?.(Math.floor(Math.random() * 3) + 1)
                      } catch (e) {}
                    }, 500)
                  }
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  onStateChangeRef.current?.(slotNumber, 'paused')
                } else if (event.data === window.YT.PlayerState.BUFFERING) {
                  onStateChangeRef.current?.(slotNumber, 'buffering')
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  onStateChangeRef.current?.(slotNumber, 'ended')
                  onEndedRef.current?.()
                }
              },
              onError: (event) => {
                const code = event.data
                let msg = `Player Error (${code})`
                if (code === 101 || code === 150) {
                  msg = 'Owner disabled playback in embeds (Error 150)'
                } else if (code === 100) {
                  msg = 'Video not found or removed (Error 100)'
                } else if (code === 2) {
                  msg = 'Invalid video ID parameter (Error 2)'
                }
                console.warn(`[Slot ${slotNumber}] ${msg}. Auto-skipping in 3s...`)
                setErrorMessage(`${msg}. Auto-skipping...`)
                onErrorRef.current?.(slotNumber, code, videoId)
                
                setTimeout(() => {
                  if (isMounted) {
                    onEndedRef.current?.()
                  }
                }, 3000)
              }
            }
          })
        } catch (ytErr) {
          console.error(`[Slot ${slotNumber}] Failed to instantiate YT.Player:`, ytErr)
          clearTimeout(loadingTimeout)
          setLoading(false)
        }
      } else if (platform === 'tiktok') {
        if (!isMounted || !containerRef.current) return
        const iframe = document.createElement('iframe')
        iframe.id = `tiktok-iframe-${slotNumber}`
        iframe.src = `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1`
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.border = 'none'
        iframe.allow = 'autoplay; fullscreen'
        
        containerRef.current.appendChild(iframe)

        setTimeout(() => {
          registerAdapter({
            play: () => {},
            pause: () => {},
            setVolume: () => {},
            setMuted: () => {},
            stop: () => {}
          })
          onStateChangeRef.current?.(slotNumber, 'playing')
        }, 1000)

        const fallbackTimer = setTimeout(() => {
          onEndedRef.current?.()
        }, 45000)

        playerRef.current = {
          destroy: () => {
            clearTimeout(fallbackTimer)
            iframe.remove()
          }
        }

      } else if (platform === 'facebook') {
        await loadFacebookApi()
        if (!isMounted || !containerRef.current) return

        const cbToken = Date.now() + Math.floor(Math.random() * 100000)
        const fbUrl = videoId.includes('?') ? `${videoId}&cb=${cbToken}` : `${videoId}?cb=${cbToken}`
        const uniqueId = `fb-player-${slotNumber}`
        
        const fbContainer = document.createElement('div')
        fbContainer.id = uniqueId
        fbContainer.className = 'fb-video'
        fbContainer.setAttribute('data-href', fbUrl)
        fbContainer.setAttribute('data-allowfullscreen', 'true')
        fbContainer.setAttribute('data-autoplay', 'true')
        fbContainer.setAttribute('data-show-text', 'false')
        fbContainer.setAttribute('data-controls', 'true')
        fbContainer.className = 'fb-video w-full h-full flex items-center justify-center'

        containerRef.current.appendChild(fbContainer)

        let isAdapterRegistered = false
        
        const onFbReady = (msg) => {
          if (msg.type === 'video' && msg.id === uniqueId) {
            const fbPlayer = msg.instance
            
            fbPlayer.subscribe('startedPlaying', () => {
              onStateChangeRef.current?.(slotNumber, 'playing')
            })
            fbPlayer.subscribe('paused', () => {
              onStateChangeRef.current?.(slotNumber, 'paused')
            })
            fbPlayer.subscribe('finishedPlaying', () => {
              onStateChangeRef.current?.(slotNumber, 'ended')
              onEndedRef.current?.()
            })

            registerAdapter({
              play: () => {
                try { fbPlayer.play() } catch (e) { console.error('FB play error', e) }
              },
              pause: () => {
                try { fbPlayer.pause() } catch (e) { console.error('FB pause error', e) }
              },
              setVolume: (v) => {
                try { fbPlayer.setVolume(v / 100) } catch (e) { console.error('FB setVolume error', e) }
              },
              setMuted: (m) => {
                try { m ? fbPlayer.mute() : fbPlayer.unmute() } catch (e) { console.error('FB mute error', e) }
              },
              stop: () => {
                try { fbPlayer.pause() } catch (e) { console.error('FB pause error', e) }
              }
            })
            isAdapterRegistered = true
            window.FB.Event.unsubscribe('xfbml.ready', onFbReady)
          }
        }

        window.FB.Event.subscribe('xfbml.ready', onFbReady)

        setTimeout(() => {
          if (window.FB && window.FB.XFBML) {
            window.FB.XFBML.parse(containerRef.current)
          }
        }, 100)

        setTimeout(() => {
          if (!isAdapterRegistered && isMounted) {
            registerAdapter({
              play: () => {
                const innerPlayButton = containerRef.current?.querySelector('button, [role="button"]')
                if (innerPlayButton) innerPlayButton.click()
              },
              pause: () => {
                const innerVideo = containerRef.current?.querySelector('video')
                if (innerVideo) innerVideo.pause()
              },
              setVolume: () => {},
              setMuted: () => {},
              stop: () => {}
            })
            onStateChangeRef.current?.(slotNumber, 'playing')
          }
        }, 3000)

        playerRef.current = {
          destroy: () => {
            if (window.FB) {
              window.FB.Event.unsubscribe('xfbml.ready', onFbReady)
            }
            fbContainer.remove()
          }
        }
      }
    }

    initPlayer()

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
      clearTimeout(hangTimeout)
      clearTimeout(autoSkipTimeout)
      try {
        if (playerRef.current && playerRef.current.destroy) {
          playerRef.current.destroy()
        }
      } catch (err) {
        console.warn(`[Slot ${slotNumber}] Destroy error:`, err)
      }
      if (containerRef.current) {
        try {
          containerRef.current.innerHTML = ''
        } catch (e) {}
      }
      delete window[`player_${slotNumber}`]
    }
  }, [videoId, platform, slotNumber])

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden select-none">
      {/* Isolated Mount Container - React never mutates its inner DOM */}
      <div ref={containerRef} className="w-full h-full absolute inset-0"></div>

      {loading && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-blue-500"></div>
          <span className="text-[11px] text-slate-300">Connecting stream...</span>
        </div>
      )}
      {streamHanging && !errorMessage && (
        <div className="absolute bottom-2 left-2 right-2 bg-slate-950/95 border border-amber-500/80 p-2 rounded flex items-center justify-between text-xs z-20 shadow-xl">
          <span className="text-[11px] text-amber-300 flex items-center gap-1 font-medium">
            <span>⚠️</span> Stream taking long to load
          </span>
          <button
            type="button"
            onClick={() => onEndedRef.current?.()}
            className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors"
          >
            ⏭ Skip Video
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-20">
          <span className="text-amber-400 text-xs font-semibold mb-1">⚠️ Video Restricted</span>
          <p className="text-[11px] text-slate-300 mb-3 max-w-xs">{errorMessage}</p>
          <button
            type="button"
            onClick={() => onEndedRef.current?.()}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors"
          >
            Skip Video ⏭
          </button>
        </div>
      )}
    </div>
  )
}

export default UniversalPlayer
