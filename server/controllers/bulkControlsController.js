const { all, run } = require('../database');

// Execute bulk action on all players
exports.bulkAction = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { action } = req.body;

    if (!['play', 'pause', 'mute', 'unmute', 'stop', 'clear'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // For clear action, execute a direct bulk clear on all player slots for this session
    if (action === 'clear') {
      await run(
        'UPDATE player_slots SET video_id = NULL, is_playing = 0, playback_position = 0, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [sessionId]
      );
      if (!isNaN(sessionId)) {
        await run(
          'UPDATE player_slots SET video_id = NULL, is_playing = 0, playback_position = 0, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
          [Number(sessionId)]
        );
      }

      const updatedPlayers = await all(
        'SELECT * FROM player_slots WHERE session_id = ?',
        [sessionId]
      );

      return res.json({
        action,
        affectedPlayers: updatedPlayers.length,
        players: updatedPlayers
      });
    }

    // Get all player slots
    const players = await all(
      'SELECT * FROM player_slots WHERE session_id = ?',
      [sessionId]
    );

    // Apply action based on request
    const updates = [];
    for (const player of players) {
      if (action === 'play') {
        updates.push(
          run(
            'UPDATE player_slots SET is_playing = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [player.id]
          )
        );
      } else if (action === 'pause' || action === 'stop') {
        updates.push(
          run(
            'UPDATE player_slots SET is_playing = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [player.id]
          )
        );
      } else if (action === 'mute') {
        updates.push(
          run(
            'UPDATE player_slots SET volume = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [player.id]
          )
        );
      } else if (action === 'unmute') {
        updates.push(
          run(
            'UPDATE player_slots SET volume = 50, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [player.id]
          )
        );
      }
    }

    await Promise.all(updates);

    const updatedPlayers = await all(
      'SELECT * FROM player_slots WHERE session_id = ?',
      [sessionId]
    );

    res.json({
      action,
      affectedPlayers: updatedPlayers.length,
      players: updatedPlayers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
