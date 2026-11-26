const { get, all, run } = require('../database');

// Get queue
exports.getQueue = async (req, res) => {
  try {
    const videos = await all(
      `SELECT * FROM videos
       WHERE id NOT IN (
         SELECT video_id FROM player_slots WHERE video_id IS NOT NULL
       )
       ORDER BY added_at DESC`,
      []
    );

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add video to queue
exports.addVideo = async (req, res) => {
  try {
    const { youtubeId, title, description, thumbnailUrl, duration, platform } = req.body;

    if (!youtubeId || !title) {
      return res.status(400).json({ error: 'youtubeId and title are required' });
    }

    const result = await run(
      `INSERT OR IGNORE INTO videos (youtube_id, title, description, thumbnail_url, duration, platform)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [youtubeId, title, description || null, thumbnailUrl || null, duration || 0, platform || 'youtube']
    );

    const video = await get('SELECT * FROM videos WHERE youtube_id = ?', [youtubeId]);

    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove video from queue (and clear it from any player slot)
exports.removeVideo = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    // 1. If numeric ID, remove from player slots and videos
    if (!isNaN(videoId)) {
      const numId = Number(videoId);
      await run('UPDATE player_slots SET video_id = NULL, is_playing = 0 WHERE video_id = ?', [numId]);
      await run('DELETE FROM videos WHERE id = ?', [numId]);
    }

    // 2. Also check and remove by youtube_id string
    const vidRow = await get('SELECT id FROM videos WHERE youtube_id = ?', [videoId]);
    if (vidRow?.id) {
      await run('UPDATE player_slots SET video_id = NULL, is_playing = 0 WHERE video_id = ?', [vidRow.id]);
      await run('DELETE FROM videos WHERE id = ?', [vidRow.id]);
    }
    await run('DELETE FROM videos WHERE youtube_id = ?', [videoId]);

    res.json({ message: 'Video removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Shuffle queue
exports.shuffleQueue = async (req, res) => {
  try {
    const includeAssigned = req.query.all === 'true';
    let videos;

    if (includeAssigned) {
      videos = await all('SELECT * FROM videos ORDER BY RANDOM()');
    } else {
      videos = await all(
        `SELECT * FROM videos
         WHERE id NOT IN (
           SELECT video_id FROM player_slots WHERE video_id IS NOT NULL
         )
         ORDER BY RANDOM()`,
        []
      );

      // 24/7 continuous stream fallback: if unassigned queue is empty, cycle all videos
      if (videos.length === 0) {
        videos = await all('SELECT * FROM videos ORDER BY RANDOM()');
      }
    }

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Auto fill empty slots from queue
exports.autoFill = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const sId = Number(sessionId) || sessionId;
    const session = await get('SELECT * FROM multi_player_sessions WHERE id = ? OR id = ?', [sessionId, sId]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const maxSlots = session.active_players || 4;

    // Find slots without a valid video
    const emptySlots = await all(
      `SELECT slot_number FROM player_slots 
       WHERE (session_id = ? OR session_id = ?) AND slot_number <= ? AND (video_id IS NULL OR video_id NOT IN (SELECT id FROM videos))
       ORDER BY slot_number`,
      [sessionId, sId, maxSlots]
    );

    if (emptySlots.length === 0) {
      return res.json({ message: 'All slots already assigned', filledCount: 0 });
    }

    // Fetch next available videos from queue
    const availableVideos = await all(
      `SELECT id FROM videos 
       WHERE id NOT IN (
         SELECT video_id FROM player_slots WHERE (session_id = ? OR session_id = ?) AND video_id IS NOT NULL
       )
       ORDER BY added_at DESC
       LIMIT ?`,
      [sessionId, sId, emptySlots.length]
    );

    let filledCount = 0;
    for (let i = 0; i < Math.min(emptySlots.length, availableVideos.length); i++) {
      const slotNum = emptySlots[i].slot_number;
      const vidId = availableVideos[i].id;
      await run(
        'UPDATE player_slots SET video_id = ?, is_playing = 1, updated_at = CURRENT_TIMESTAMP WHERE (session_id = ? OR session_id = ?) AND slot_number = ?',
        [vidId, sessionId, sId, slotNum]
      );
      filledCount++;
    }

    res.json({ message: `Assigned ${filledCount} videos`, filledCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Clear unassigned videos from queue (or all videos if all=true)
exports.clearQueue = async (req, res) => {
  try {
    const isAll = req.query.all === 'true' || req.body?.all === true;

    if (isAll) {
      await run('UPDATE player_slots SET video_id = NULL, is_playing = 0, playback_position = 0');
      const result = await run('DELETE FROM videos', []);
      return res.json({ message: 'All queue links and player links cleared', removedCount: result?.changes || 0 });
    }

    const result = await run(
      `DELETE FROM videos
       WHERE id NOT IN (
         SELECT video_id FROM player_slots WHERE video_id IS NOT NULL
       )`,
      []
    );

    res.json({ message: 'Queue cleared', removedCount: result?.changes || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk add videos
exports.bulkAddVideos = async (req, res) => {
  try {
    const { videos } = req.body;

    if (!Array.isArray(videos)) {
      return res.status(400).json({ error: 'videos must be an array' });
    }

    const results = [];

    for (const video of videos) {
      const { youtubeId, title, description, thumbnailUrl, duration, platform } = video;

      if (!youtubeId || !title) continue;

      await run(
        `INSERT OR IGNORE INTO videos (youtube_id, title, description, thumbnail_url, duration, platform)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [youtubeId, title, description || null, thumbnailUrl || null, duration || 0, platform || 'youtube']
      );

      const inserted = await get('SELECT * FROM videos WHERE youtube_id = ?', [youtubeId]);
      results.push(inserted);
    }

    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
