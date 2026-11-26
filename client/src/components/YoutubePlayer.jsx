import React, { useEffect, useRef } from 'react'

let youtubeApiPromise = null

const loadYouTubeApi = () => {
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    )

    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') {
        previousReady()
      }
      resolve(window.YT)
    }
  })

  return youtubeApiPromise
}

function YoutubePlayer({ videoId, slotNumber, onReady, onEnded }) {
  const iframeRef = useRef(null)
  const playerRef = useRef(null)
  const onReadyRef = useRef(onReady)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    let isMounted = true

    const initPlayer = async () => {
      await loadYouTubeApi()
      if (!isMounted) return
      if (!iframeRef.current) return

      playerRef.current = new window.YT.Player(iframeRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          fs: 1,
          rel: 0
        },
        events: {
          onReady: (event) => {
            window[`player_${slotNumber}`] = event.target
            event.target.setVolume(50)
            onReadyRef.current?.()
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onEndedRef.current?.()
            }
          }
        }
      })
    }

    initPlayer()

    return () => {
      isMounted = false
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, slotNumber])

  return <div ref={iframeRef} className="w-full h-full"></div>
}

export default YoutubePlayer
