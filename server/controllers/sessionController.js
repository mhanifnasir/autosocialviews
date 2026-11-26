const { get, all, run } = require('../database');

const ensurePlayerSlots = async (sessionId, playerCount) => {
  const count = playerCount || 0;
  for (let i = 1; i <= count; i += 1) {
    await run(
      'INSERT OR IGNORE INTO player_slots (session_id, slot_number) VALUES (?, ?)',
      [sessionId, i]
    );
  }
};

// Get or create current session
exports.getCurrentSession = async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    let session = await get(
      'SELECT * FROM multi_player_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (!session) {
      const result = await run(
        'INSERT INTO multi_player_sessions (user_id, layout_type, active_players) VALUES (?, ?, ?)',
        [userId, '2x2', 4]
      );
      session = await get('SELECT * FROM multi_player_sessions WHERE id = ?', [result.lastID]);
    }

    await ensurePlayerSlots(session.id, session.active_players || 4);

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new session
exports.createSession = async (req, res) => {
  try {
    const { layoutType, activePlayerCount, userId } = req.body;
    const uid = userId || 'default';
    const layout = layoutType || '2x2';
    const playerCount = activePlayerCount || 4;

    const result = await run(
      'INSERT INTO multi_player_sessions (user_id, layout_type, active_players) VALUES (?, ?, ?)',
      [uid, layout, playerCount]
    );

    const session = await get(
      'SELECT * FROM multi_player_sessions WHERE id = ?',
      [result.lastID]
    );

    // Initialize player slots
    for (let i = 1; i <= playerCount; i++) {
      await run(
        'INSERT OR IGNORE INTO player_slots (session_id, slot_number) VALUES (?, ?)',
        [session.id, i]
      );
    }

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const layoutType = req.body.layoutType || req.body.layout_type;
    const activePlayerCount = req.body.activePlayerCount || req.body.active_players;

    const updates = [];
    const params = [];

    if (layoutType) {
      updates.push('layout_type = ?');
      params.push(layoutType);
    }
    if (activePlayerCount) {
      updates.push('active_players = ?');
      params.push(activePlayerCount);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    if (updates.length > 1) {
      await run(
        `UPDATE multi_player_sessions SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const session = await get('SELECT * FROM multi_player_sessions WHERE id = ?', [id]);
    await ensurePlayerSlots(session.id, session.active_players || 4);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get session players
exports.getSessionPlayers = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const players = await all(
      `SELECT ps.*, v.youtube_id, v.title, v.thumbnail_url, v.platform
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

// Reset session: unassign all slots, clear queue/videos, reset to default 2x2 layout
exports.resetSession = async (req, res) => {
  try {
    const { id } = req.params;
    await run(
      'UPDATE player_slots SET video_id = NULL, is_playing = 0, playback_position = 0, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [id]
    );
    if (!isNaN(id)) {
      await run(
        'UPDATE player_slots SET video_id = NULL, is_playing = 0, playback_position = 0, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [Number(id)]
      );
    }
    await run('DELETE FROM videos', []);
    await run(
      'UPDATE multi_player_sessions SET layout_type = ?, active_players = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['2x2', 4, id]
    );
    if (!isNaN(id)) {
      await run(
        'UPDATE multi_player_sessions SET layout_type = ?, active_players = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['2x2', 4, Number(id)]
      );
    }
    const session = await get('SELECT * FROM multi_player_sessions WHERE id = ?', [id]);
    res.json({ message: 'Session reset successfully', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
