const { get, all, run } = require('../database');

// Assign video to player slot
exports.assignVideo = async (req, res) => {
  try {
    const { sessionId, slotNumber } = req.params;
    const { videoId, isPlaying } = req.body;

    const sId = Number(sessionId) || sessionId;
    const sNum = Number(slotNumber) || slotNumber;

    if (!videoId) {
      // Clear slot
      await run(
        'UPDATE player_slots SET video_id = NULL, is_playing = 0, playback_position = 0, updated_at = CURRENT_TIMESTAMP WHERE (session_id = ? OR session_id = ?) AND slot_number = ?',
        [sessionId, sId, sNum]
      );
    } else {
      // Resolve video ID (handles if videoId is YouTube ID string or numeric ID)
      let resolvedId = videoId;
      if (isNaN(videoId)) {
        const vid = await get('SELECT id FROM videos WHERE youtube_id = ?', [videoId]);
        if (vid?.id) resolvedId = vid.id;
      }
      const vId = Number(resolvedId) || resolvedId;
      const playingVal = isPlaying !== undefined ? (isPlaying ? 1 : 0) : 1;
      await run(
        'UPDATE player_slots SET video_id = ?, is_playing = ?, updated_at = CURRENT_TIMESTAMP WHERE (session_id = ? OR session_id = ?) AND slot_number = ?',
        [vId, playingVal, sessionId, sId, sNum]
      );
    }

    const player = await get(
      `SELECT ps.*, v.youtube_id, v.title, v.thumbnail_url, v.platform
       FROM player_slots ps
       LEFT JOIN videos v ON ps.video_id = v.id
       WHERE (ps.session_id = ? OR ps.session_id = ?) AND ps.slot_number = ?`,
      [sessionId, sId, sNum]
    );

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update player state
exports.updatePlayer = async (req, res) => {
  try {
    const { sessionId, slotNumber } = req.params;
    const { isPlaying, volume, playbackSpeed, playbackPosition } = req.body;

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const params = [];

    if (isPlaying !== undefined) {
      updates.push('is_playing = ?');
      params.push(isPlaying ? 1 : 0);
    }
    if (volume !== undefined) {
      updates.push('volume = ?');
      params.push(volume);
    }
    if (playbackSpeed !== undefined) {
      updates.push('playback_speed = ?');
      params.push(playbackSpeed);
    }
    if (playbackPosition !== undefined) {
      updates.push('playback_position = ?');
      params.push(playbackPosition);
    }

    params.push(sessionId);
    params.push(slotNumber);

    if (updates.length > 1) {
      await run(
        `UPDATE player_slots SET ${updates.join(', ')} WHERE session_id = ? AND slot_number = ?`,
        params
      );
    }

    const player = await get(
      'SELECT * FROM player_slots WHERE session_id = ? AND slot_number = ?',
      [sessionId, slotNumber]
    );

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all players for a session
exports.getPlayers = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const players = await all(
      `SELECT ps.*, v.youtube_id, v.title, v.thumbnail_url, v.duration, v.platform
       FROM player_slots ps
       LEFT JOIN videos v ON ps.video_id = v.id
       WHERE ps.session_id = ?
       ORDER BY ps.slot_number`,
      [sessionId]
    );

    res.json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
