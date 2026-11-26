const { get, all, run } = require('../database');

// Get user preferences
exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const prefs = await get(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    );

    if (!prefs) {
      return res.json({
        user_id: userId,
        default_layout: '2x2',
        default_player_count: 4,
        default_volume: 50,
        default_playback_speed: 1.0,
        theme: 'dark'
      });
    }

    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Save user preferences
exports.savePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { defaultLayout, defaultPlayerCount, defaultVolume, defaultPlaybackSpeed, theme } = req.body;

    await run(
      `INSERT INTO user_preferences (user_id, default_layout, default_player_count, default_volume, default_playback_speed, theme)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
       default_layout = excluded.default_layout,
       default_player_count = excluded.default_player_count,
       default_volume = excluded.default_volume,
       default_playback_speed = excluded.default_playback_speed,
       theme = excluded.theme,
       updated_at = CURRENT_TIMESTAMP`,
      [userId, defaultLayout || '2x2', defaultPlayerCount || 4, defaultVolume || 50, defaultPlaybackSpeed || 1.0, theme || 'dark']
    );

    const prefs = await get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
