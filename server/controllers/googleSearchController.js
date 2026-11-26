const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error (${response.status}): ${errorText}`);
  }
  return response.json();
};

exports.searchVideos = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    let cx = process.env.GOOGLE_CX || '';
    
    // Sanitize cx in case HTML script tags were pasted
    const cxMatch = cx.match(/cx=([a-zA-Z0-9_\-]+)/);
    if (cxMatch) {
      cx = cxMatch[1];
    } else {
      cx = cx.replace(/<[^>]*>/g, '').trim();
    }
    
    if (!apiKey || !cx) {
      return res.status(500).json({ error: 'Google Search API Key (GOOGLE_SEARCH_API_KEY) or Custom Search Engine ID (GOOGLE_CX) is not configured in .env' });
    }

    let { q, platform } = req.query;
    q = (q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let siteFilter = '';
    if (platform === 'youtube') {
      siteFilter = 'site:youtube.com/watch';
    } else if (platform === 'tiktok') {
      siteFilter = 'site:tiktok.com/*/video';
    } else if (platform === 'facebook') {
      siteFilter = 'site:facebook.com/watch OR site:facebook.com/*/videos';
    } else {
      siteFilter = 'site:youtube.com/watch OR site:tiktok.com/*/video OR site:facebook.com/watch';
    }

    const searchQuery = `${q} ${siteFilter}`;

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    const params = new URLSearchParams({
      key: apiKey,
      cx: cx,
      q: searchQuery,
      num: '10'
    });
    url.search = params.toString();

    const data = await fetchJson(url.toString());
    
    const items = (data.items || []).map(item => {
      let resultPlatform = 'unknown';
      if (item.link.includes('youtube.com') || item.link.includes('youtu.be')) resultPlatform = 'youtube';
      else if (item.link.includes('tiktok.com')) resultPlatform = 'tiktok';
      else if (item.link.includes('facebook.com') || item.link.includes('fb.watch')) resultPlatform = 'facebook';

      return {
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        platform: resultPlatform,
        thumbnailUrl: item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src || null
      };
    });

    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
