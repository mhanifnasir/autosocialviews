const { run } = require('../database');

const getApiKey = () => process.env.YOUTUBE_API_KEY;

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${errorText}`);
  }
  return response.json();
};

const getUploadsPlaylistId = async (apiKey, channelId) => {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.search = new URLSearchParams({
    part: 'contentDetails',
    id: channelId,
    key: apiKey
  }).toString();

  const data = await fetchJson(url.toString());
  if (!data.items || data.items.length === 0) return null;
  return data.items[0].contentDetails?.relatedPlaylists?.uploads || null;
};

const mapPlaylistItems = (data) => {
  return (data.items || []).map((item) => ({
    youtubeId: item.contentDetails?.videoId,
    title: item.snippet?.title,
    thumbnailUrl: item.snippet?.thumbnails?.medium?.url
      || item.snippet?.thumbnails?.default?.url
      || null
  })).filter((item) => item.youtubeId && item.title);
};

exports.searchChannels = async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured' });
    }

    const query = (req.query.q || '').trim();
    const regionCode = (req.query.regionCode || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      maxResults: '10',
      q: query,
      key: apiKey
    });
    if (regionCode) {
      params.set('regionCode', regionCode);
    }
    url.search = params.toString();

    const data = await fetchJson(url.toString());
    const items = (data.items || []).map((item) => ({
      channelId: item.id?.channelId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url || null
    })).filter((item) => item.channelId);

    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChannelUploads = async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured' });
    }

    const { channelId } = req.params;
    const maxResultsRaw = parseInt(req.query.maxResults || '50', 10);
    const maxResults = Math.min(Math.max(maxResultsRaw, 1), 50);
    const pageToken = req.query.pageToken || undefined;

    const uploadsPlaylistId = await getUploadsPlaylistId(apiKey, channelId);
    if (!uploadsPlaylistId) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(maxResults),
      key: apiKey
    });
    if (pageToken) params.set('pageToken', pageToken);
    url.search = params.toString();

    const data = await fetchJson(url.toString());
    const items = (data.items || []).map((item) => ({
      youtubeId: item.contentDetails?.videoId,
      title: item.snippet?.title,
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url
        || item.snippet?.thumbnails?.default?.url
        || null
    })).filter((item) => item.youtubeId);

    res.json({
      items,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || items.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importChannelUploads = async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured' });
    }

    const { channelId } = req.params;
    const maxResultsRaw = parseInt(req.body.maxResults || '0', 10);
    const maxResults = Number.isFinite(maxResultsRaw) && maxResultsRaw > 0 ? maxResultsRaw : null;
    const maxPagesRaw = parseInt(req.body.maxPages || '0', 10);
    const maxPages = Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? maxPagesRaw : null;

    const uploadsPlaylistId = await getUploadsPlaylistId(apiKey, channelId);
    if (!uploadsPlaylistId) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    let pageToken = null;
    let importedCount = 0;
    let skippedCount = 0;
    let fetchedCount = 0;
    let pageCount = 0;

    do {
      pageCount += 1;
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: '50',
        key: apiKey
      });
      if (pageToken) params.set('pageToken', pageToken);
      url.search = params.toString();

      const data = await fetchJson(url.toString());
      const items = (data.items || []).map((item) => ({
        youtubeId: item.contentDetails?.videoId,
        title: item.snippet?.title,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url
          || item.snippet?.thumbnails?.default?.url
          || null
      })).filter((item) => item.youtubeId && item.title);

      for (const video of items) {
        if (maxResults && fetchedCount >= maxResults) break;
        fetchedCount += 1;

        const result = await run(
          `INSERT OR IGNORE INTO videos (youtube_id, title, description, thumbnail_url, duration)
           VALUES (?, ?, ?, ?, ?)`,
          [video.youtubeId, video.title, null, video.thumbnailUrl, 0]
        );

        if (result.changes > 0) importedCount += 1;
        else skippedCount += 1;
      }

      pageToken = data.nextPageToken || null;

      if (maxResults && fetchedCount >= maxResults) break;
      if (maxPages && pageCount >= maxPages) break;
    } while (pageToken);

    res.json({
      importedCount,
      skippedCount,
      fetchedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importPlaylist = async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured' });
    }

    const { playlistId } = req.params;
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    const maxResultsRaw = parseInt(req.body.maxResults || '0', 10);
    const maxResults = Number.isFinite(maxResultsRaw) && maxResultsRaw > 0 ? maxResultsRaw : null;
    const maxPagesRaw = parseInt(req.body.maxPages || '0', 10);
    const maxPages = Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? maxPagesRaw : null;

    let pageToken = null;
    let importedCount = 0;
    let skippedCount = 0;
    let fetchedCount = 0;
    let pageCount = 0;

    do {
      pageCount += 1;
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId: playlistId,
        maxResults: '50',
        key: apiKey
      });
      if (pageToken) params.set('pageToken', pageToken);
      url.search = params.toString();

      const data = await fetchJson(url.toString());
      const items = mapPlaylistItems(data);

      for (const video of items) {
        if (maxResults && fetchedCount >= maxResults) break;
        fetchedCount += 1;

        const result = await run(
          `INSERT OR IGNORE INTO videos (youtube_id, title, description, thumbnail_url, duration)
           VALUES (?, ?, ?, ?, ?)`,
          [video.youtubeId, video.title, null, video.thumbnailUrl, 0]
        );

        if (result.changes > 0) importedCount += 1;
        else skippedCount += 1;
      }

      pageToken = data.nextPageToken || null;

      if (maxResults && fetchedCount >= maxResults) break;
      if (maxPages && pageCount >= maxPages) break;
    } while (pageToken);

    res.json({
      importedCount,
      skippedCount,
      fetchedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
