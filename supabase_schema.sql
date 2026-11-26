-- AutoViews Supabase PostgreSQL Schema
-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Sessions Table
CREATE TABLE IF NOT EXISTS multi_player_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT DEFAULT 'default',
  layout_type TEXT DEFAULT '2x2',
  active_players INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Videos Library / Queue Table
CREATE TABLE IF NOT EXISTS videos (
  id BIGSERIAL PRIMARY KEY,
  youtube_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  platform TEXT DEFAULT 'youtube',
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Player Slots Table
CREATE TABLE IF NOT EXISTS player_slots (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES multi_player_sessions(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  video_id BIGINT REFERENCES videos(id) ON DELETE SET NULL,
  playback_position REAL DEFAULT 0,
  is_playing BOOLEAN DEFAULT FALSE,
  volume INTEGER DEFAULT 50,
  playback_speed REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, slot_number)
);

-- 4. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  default_layout TEXT DEFAULT '2x2',
  default_player_count INTEGER DEFAULT 4,
  default_volume INTEGER DEFAULT 50,
  default_playback_speed REAL DEFAULT 1.0,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security (RLS) & Policies
ALTER TABLE multi_player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write sessions" ON multi_player_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write videos" ON videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write player_slots" ON player_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write user_preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
