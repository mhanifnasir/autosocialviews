import React, { useEffect, useState } from 'react'
import api from '../services/api'

function VideoImporter({ onQueueUpdate }) {
  const regionOptions = [
    { code: 'US', label: 'USA' },
    { code: 'GB', label: 'UK' },
    { code: 'DE', label: 'Germany' },
    { code: 'IN', label: 'India' },
    { code: 'PK', label: 'Pakistan' }
  ]
  const regionStorageKey = 'ytRegionIndex'

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [channelQuery, setChannelQuery] = useState('')
  const [channelResults, setChannelResults] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [channelVideos, setChannelVideos] = useState([])
  const [channelLoading, setChannelLoading] = useState(false)
  const [channelError, setChannelError] = useState(null)
  const [channelSuccess, setChannelSuccess] = useState(null)
  const [pageTokens, setPageTokens] = useState([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [nextPageToken, setNextPageToken] = useState(null)
  const [importingAll, setImportingAll] = useState(false)
  const [regionCode, setRegionCode] = useState(regionOptions[0].code)
  const [searchPlatform, setSearchPlatform] = useState('youtube')

  const [googleQuery, setGoogleQuery] = useState('')
  const [googlePlatform, setGooglePlatform] = useState('all')
  const [googleResults, setGoogleResults] = useState([])
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState(null)
  const [googleSuccess, setGoogleSuccess] = useState(null)

  useEffect(() => {
    const storedIndex = parseInt(localStorage.getItem(regionStorageKey) || '-1', 10)
    const safeIndex = Number.isFinite(storedIndex) ? storedIndex : -1
    const nextIndex = (safeIndex + 1) % regionOptions.length
    setRegionCode(regionOptions[nextIndex].code)
    localStorage.setItem(regionStorageKey, String(nextIndex))
  }, [])

  const extractYouTubeId = (url) => {
    if (!url) return null
    const trimmed = url.trim()
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed
    }
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/
    const match = trimmed.match(regExp)
    if (match) return match[1]
    const fallback = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const fallbackMatch = trimmed.match(fallback)
    return fallbackMatch && fallbackMatch[2].length === 11 ? fallbackMatch[2] : null
  }

  const extractPlaylistId = (url) => {
    const listMatch = url.match(/[?&]list=([^#&]+)/)
    if (listMatch) return listMatch[1]

    try {
      const parsed = new URL(url)
      return parsed.searchParams.get('list')
    } catch (error) {
      return null
    }
  }

  const extractTikTokId = (url) => {
    const reg = /\/video\/(\d+)/
    const match = url.match(reg)
    if (match) return match[1]
    if (/^\d+$/.test(url.trim())) {
      return url.trim()
    }
    return null
  }

  const extractFacebookUrlAndId = (url) => {
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.watch')) {
        let videoId = null
        const reelMatch = url.match(/\/reel\/(\d+)/)
        const videoMatch = url.match(/\/videos\/(\d+)/)
        const queryMatch = urlObj.searchParams.get('v')
        
        if (reelMatch) videoId = reelMatch[1]
        else if (videoMatch) videoId = videoMatch[1]
        else if (queryMatch) videoId = queryMatch
        else {
          videoId = urlObj.pathname.split('/').filter(Boolean).pop()
        }
        return {
          url: urlObj.href,
          id: videoId || urlObj.href
        }
      }
    } catch (e) {
      if (/^\d+$/.test(url.trim())) {
        return {
          url: `https://www.facebook.com/watch/?v=${url.trim()}`,
          id: url.trim()
        }
      }
    }
    return null
  }

  const handleImport = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const input = youtubeUrl.trim()
    if (!input) return

    const lines = input.split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length === 0) return

    setIsLoading(true)
    let addedCount = 0
    let failedCount = 0

    // If it's a single line and it's a playlist, keep the playlist logic
    if (lines.length === 1) {
      const playlistId = extractPlaylistId(lines[0])
      if (playlistId) {
        try {
          const response = await api.post(`/youtube/playlists/${playlistId}/import`)
          const imported = response.data?.importedCount || 0
          setSuccess(`Imported ${imported} videos from playlist`)
          setYoutubeUrl('')
          if (onQueueUpdate) onQueueUpdate()
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to import playlist')
        } finally {
          setIsLoading(false)
        }
        return
      }
    }

    const videosToBulkAdd = []

    for (const line of lines) {
      let platform = 'youtube'
      let videoId = null
      let title = ''
      let thumbnailUrl = ''

      const ytId = extractYouTubeId(line)
      if (ytId) {
        platform = 'youtube'
        videoId = ytId
        title = `YouTube: ${ytId}`
        thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      } else {
        const ttId = extractTikTokId(line)
        if (ttId) {
          platform = 'tiktok'
          videoId = ttId
          title = `TikTok: ${ttId}`
          thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/a/a2/TikTok_logo.svg'
        } else {
          const fbInfo = extractFacebookUrlAndId(line)
          if (fbInfo) {
            platform = 'facebook'
            videoId = fbInfo.url
            title = `Facebook: ${fbInfo.id}`
            thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg'
          }
        }
      }

      if (videoId) {
        videosToBulkAdd.push({ youtubeId: videoId, title, thumbnailUrl, platform })
      } else {
        failedCount++
      }
    }

    if (videosToBulkAdd.length > 0) {
      try {
        await api.post('/queue/bulk', { videos: videosToBulkAdd })
        addedCount = videosToBulkAdd.length
        setSuccess(`Added ${addedCount} videos to queue.` + (failedCount > 0 ? ` Failed to parse ${failedCount} lines.` : ''))
        setYoutubeUrl('')
        if (onQueueUpdate) onQueueUpdate()
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to bulk add videos')
      }
    } else if (failedCount > 0) {
      setError(`Failed to parse any valid URLs from ${failedCount} lines.`)
    }

    setIsLoading(false)
  }

  const handleGoogleSearch = async (event) => {
    event.preventDefault()
    setGoogleError(null)
    setGoogleSuccess(null)
    setGoogleLoading(true)
    setGoogleResults([])

    try {
      const response = await api.get('/google/search', {
        params: { q: googleQuery.trim(), platform: googlePlatform }
      })
      const items = Array.isArray(response.data?.items) ? response.data.items : []
      setGoogleResults(items)
      if (items.length === 0) {
        setGoogleError('No videos found on Google for this query.')
      }
    } catch (err) {
      setGoogleError(err.response?.data?.error || err.message || 'Failed to search Google')
      setGoogleResults([])
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleAddGoogleResult = async (item) => {
    setGoogleError(null)
    setGoogleSuccess(null)
    
    let platform = item.platform
    let videoId = null
    
    if (platform === 'youtube') videoId = extractYouTubeId(item.url)
    else if (platform === 'tiktok') videoId = extractTikTokId(item.url)
    else if (platform === 'facebook') {
      const fbInfo = extractFacebookUrlAndId(item.url)
      if (fbInfo) videoId = fbInfo.url
    }
    
    if (!videoId) {
      setGoogleError('Could not extract video ID from this link.')
      return
    }

    try {
      await api.post('/queue/bulk', { 
        videos: [{
          youtubeId: videoId,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl || (platform === 'youtube' ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''),
          platform
        }]
      })
      setGoogleSuccess(`Added to queue!`)
      if (onQueueUpdate) onQueueUpdate()
    } catch (err) {
      setGoogleError(err.response?.data?.error || 'Failed to add video')
    }
  }

  const handleChannelSearch = async (event) => {
    event.preventDefault()
    setChannelError(null)
    setChannelSuccess(null)

    if (searchPlatform !== 'youtube') {
      const platformName = searchPlatform === 'tiktok' ? 'TikTok' : 'Facebook'
      setChannelError(`${platformName} channel search requires 3rd-party API keys which are not currently configured. Please paste individual ${platformName} video URLs in the bulk importer above instead.`)
      return
    }

    setChannelLoading(true)

    try {
      const response = await api.get('/youtube/channels/search', {
        params: { q: channelQuery.trim(), regionCode }
      })
      const items = response.data.items || []
      setChannelResults(items)
      setSelectedChannel(null)
      setChannelVideos([])
      setPageTokens([null])
      setPageIndex(0)
      setNextPageToken(null)
      if (items.length === 0) {
        setChannelError('No channels found')
      }
    } catch (err) {
      setChannelError(err.response?.data?.error || 'Failed to search channels')
    } finally {
      setChannelLoading(false)
    }
  }

  const fetchChannelVideos = async (channelId, pageToken = null, nextIndex = 0) => {
    setChannelError(null)
    setChannelLoading(true)

    try {
      const response = await api.get(`/youtube/channels/${channelId}/uploads`, {
        params: {
          maxResults: 50,
          pageToken: pageToken || undefined
        }
      })

      const items = response.data.items || []
      setChannelVideos(items)
      setNextPageToken(response.data.nextPageToken || null)
      setPageIndex(nextIndex)
      setPageTokens((prev) => {
        const updated = [...prev]
        updated[nextIndex] = pageToken || null
        if (response.data.nextPageToken) {
          updated[nextIndex + 1] = response.data.nextPageToken
        }
        return updated
      })
    } catch (err) {
      setChannelError(err.response?.data?.error || 'Failed to load channel videos')
    } finally {
      setChannelLoading(false)
    }
  }

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel)
    setChannelVideos([])
    setPageTokens([null])
    setPageIndex(0)
    setNextPageToken(null)
    fetchChannelVideos(channel.channelId, null, 0)
  }

  const handlePrevPage = () => {
    if (!selectedChannel || pageIndex === 0) return
    const prevToken = pageTokens[pageIndex - 1] || null
    fetchChannelVideos(selectedChannel.channelId, prevToken, pageIndex - 1)
  }

  const handleNextPage = () => {
    if (!selectedChannel || !nextPageToken) return
    fetchChannelVideos(selectedChannel.channelId, nextPageToken, pageIndex + 1)
  }

  const handleAddPageToQueue = async () => {
    setChannelError(null)
    setChannelSuccess(null)
    if (channelVideos.length === 0) return

    try {
      await api.post('/queue/bulk', {
        videos: channelVideos.map((video) => ({
          youtubeId: video.youtubeId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl
        }))
      })
      setChannelSuccess(`Added ${channelVideos.length} videos to queue`)
      if (onQueueUpdate) onQueueUpdate()
    } catch (err) {
      setChannelError(err.response?.data?.error || 'Failed to add videos')
    }
  }

  const handleImportAll = async () => {
    if (!selectedChannel) return
    setChannelError(null)
    setChannelSuccess(null)
    setImportingAll(true)

    try {
      const response = await api.post(`/youtube/channels/${selectedChannel.channelId}/import`)
      const imported = response.data?.importedCount || 0
      setChannelSuccess(`Imported ${imported} videos from channel`)
      if (onQueueUpdate) onQueueUpdate()
    } catch (err) {
      setChannelError(err.response?.data?.error || 'Failed to import channel')
    } finally {
      setImportingAll(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Import Video or Playlist</h3>

        <form onSubmit={handleImport} className="space-y-2">
          <textarea
            rows="3"
            placeholder="Enter URLs (one per line): YouTube URL/Playlist, TikTok, or Facebook URL"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            className="w-full px-3 py-2 bg-dark-tertiary text-white text-sm rounded border border-dark-tertiary focus:border-blue-600 outline-none resize-y"
          />

          <button
            type="submit"
            disabled={isLoading || !youtubeUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-3 py-2 rounded font-semibold text-sm transition-colors"
          >
            {isLoading ? 'Adding...' : 'Add to Queue'}
          </button>
        </form>

        {error && (
          <div className="mt-2 p-2 bg-red-900 bg-opacity-30 text-red-400 text-xs rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-2 p-2 bg-green-900 bg-opacity-30 text-green-400 text-xs rounded">
            {success}
          </div>
        )}
      </div>

      <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Import Channel</h3>

        <form onSubmit={handleChannelSearch} className="space-y-2">
          <div className="flex gap-2">
            <select
              value={searchPlatform}
              onChange={(event) => setSearchPlatform(event.target.value)}
              className="w-28 px-2 py-2 bg-dark-tertiary text-white text-xs rounded border border-dark-tertiary focus:border-blue-600 outline-none"
            >
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
            </select>
            <select
              value={regionCode}
              onChange={(event) => setRegionCode(event.target.value)}
              disabled={searchPlatform !== 'youtube'}
              className="w-24 px-2 py-2 bg-dark-tertiary text-white text-xs rounded border border-dark-tertiary focus:border-blue-600 outline-none disabled:opacity-50"
            >
              {regionOptions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search channel name"
              value={channelQuery}
              onChange={(event) => setChannelQuery(event.target.value)}
              className="flex-1 px-3 py-2 bg-dark-tertiary text-white text-sm rounded border border-dark-tertiary focus:border-blue-600 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={channelLoading || !channelQuery.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-3 py-2 rounded font-semibold text-sm transition-colors"
          >
            {channelLoading ? 'Searching...' : 'Search Channels'}
          </button>
        </form>

        {channelError && (
          <div className="mt-2 p-2 bg-red-900 bg-opacity-30 text-red-400 text-xs rounded">
            {channelError}
          </div>
        )}

        {channelSuccess && (
          <div className="mt-2 p-2 bg-green-900 bg-opacity-30 text-green-400 text-xs rounded">
            {channelSuccess}
          </div>
        )}

        {Array.isArray(channelResults) && channelResults.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[11px] text-slate-400 font-medium">Found {channelResults.length} channels:</span>
              <button
                type="button"
                onClick={() => setChannelResults([])}
                className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 bg-slate-800 rounded"
              >
                Clear Results ✕
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {channelResults.map((channel) => (
                <button
                  type="button"
                  key={channel.channelId}
                  onClick={() => handleChannelSelect(channel)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded border text-left transition-colors ${
                    selectedChannel?.channelId === channel.channelId
                      ? 'border-blue-600 bg-dark-tertiary'
                      : 'border-dark-tertiary hover:border-blue-600'
                  }`}
                >
                  {channel.thumbnailUrl && (
                    <img
                      src={channel.thumbnailUrl}
                      alt={channel.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{channel.title}</p>
                    <p className="text-xs text-slate-500 truncate">{channel.description || channel.channelId}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedChannel && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">
                Selected: {selectedChannel.title} (Page {pageIndex + 1})
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={channelLoading || pageIndex === 0}
                  className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={channelLoading || !nextPageToken}
                  className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={handleAddPageToQueue}
                disabled={channelLoading || channelVideos.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-3 py-2 rounded font-semibold text-xs transition-colors"
              >
                Add Page to Queue
              </button>
              <button
                type="button"
                onClick={handleImportAll}
                disabled={channelLoading || importingAll}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-3 py-2 rounded font-semibold text-xs transition-colors"
              >
                {importingAll ? 'Importing...' : 'Import All'}
              </button>
            </div>

            {channelVideos.length === 0 && !channelLoading ? (
              <div className="text-slate-500 text-center py-4 text-xs">No videos found</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {channelVideos.map((video) => (
                  <div
                    key={video.youtubeId}
                    className="bg-dark-tertiary p-2 rounded border border-dark hover:border-blue-600 transition-colors"
                  >
                    <div className="flex gap-2">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-12 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{video.title}</p>
                        <p className="text-xs text-slate-500 truncate">{video.youtubeId}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Google Web Search</h3>

        <form onSubmit={handleGoogleSearch} className="space-y-2">
          <div className="flex gap-2">
            <select
              value={googlePlatform}
              onChange={(event) => setGooglePlatform(event.target.value)}
              className="w-24 px-2 py-2 bg-dark-tertiary text-white text-xs rounded border border-dark-tertiary focus:border-blue-600 outline-none"
            >
              <option value="all">All</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
            </select>
            <input
              type="text"
              placeholder="Search Google..."
              value={googleQuery}
              onChange={(event) => setGoogleQuery(event.target.value)}
              className="flex-1 px-3 py-2 bg-dark-tertiary text-white text-sm rounded border border-dark-tertiary focus:border-blue-600 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={googleLoading || !googleQuery.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-3 py-2 rounded font-semibold text-sm transition-colors"
          >
            {googleLoading ? 'Searching...' : 'Search Google'}
          </button>
        </form>

        {googleError && (
          <div className="mt-2 p-2 bg-red-900 bg-opacity-30 text-red-400 text-xs rounded">
            {googleError}
          </div>
        )}

        {googleSuccess && (
          <div className="mt-2 p-2 bg-green-900 bg-opacity-30 text-green-400 text-xs rounded">
            {googleSuccess}
          </div>
        )}

        {Array.isArray(googleResults) && googleResults.length > 0 && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
            {googleResults.map((item, idx) => (
              <div
                key={idx}
                className="w-full flex flex-col gap-2 p-2 rounded border border-dark-tertiary bg-dark-tertiary"
              >
                <div className="flex gap-2 items-start">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-12 h-12 rounded object-cover mt-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-dark border border-dark-tertiary flex items-center justify-center mt-1">
                      <span className="text-[10px] text-slate-500 uppercase">{item.platform}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate" title={item.title}>{item.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{item.snippet}</p>
                    <p className="text-[10px] text-blue-400 truncate mt-0.5">{item.url}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddGoogleResult(item)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs font-semibold transition-colors mt-1"
                >
                  Add to Queue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoImporter
