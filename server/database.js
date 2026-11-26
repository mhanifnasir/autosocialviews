const path = require('path');
require('dotenv').config();

// Auto-clean and sanitize DATABASE_URL (handles typos like 'ostgresql' and unencoded '@' in passwords)
function sanitizeDatabaseUrl(url) {
  if (!url) return '';
  let str = url.trim();
  if (str.startsWith('ostgresql://')) str = 'p' + str;
  if (str.startsWith('ostgres://')) str = 'p' + str;

  // Auto-encode '@' symbol in passwords to prevent URL parsing errors
  const protocolMatch = str.match(/^([a-z]+:\/\/)(.*)$/i);
  if (protocolMatch) {
    const protocol = protocolMatch[1];
    const rest = protocolMatch[2];
    const lastAtIndex = rest.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const userPass = rest.substring(0, lastAtIndex);
      const hostPortDb = rest.substring(lastAtIndex + 1);
      const colonIndex = userPass.indexOf(':');
      if (colonIndex !== -1) {
        const user = userPass.substring(0, colonIndex);
        let pass = userPass.substring(colonIndex + 1);
        pass = pass.replace(/@/g, '%40');
        return `${protocol}${user}:${pass}@${hostPortDb}`;
      }
    }
  }
  return str;
}

const cleanedDbUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
if (cleanedDbUrl && cleanedDbUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = cleanedDbUrl;
}

const isPostgres = Boolean(
  cleanedDbUrl &&
  (cleanedDbUrl.startsWith('postgres://') || cleanedDbUrl.startsWith('postgresql://') || cleanedDbUrl.includes('supabase.com'))
);

let db = null;
let pool = null;

if (isPostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: cleanedDbUrl,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✓ Using Supabase / PostgreSQL Database Connection');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const defaultDbPath = path.join(__dirname, 'videos.db');
  const configuredDbPath = process.env.DATABASE_URL;
  const dbPath = (configuredDbPath && !configuredDbPath.includes(':'))
    ? path.resolve(__dirname, configuredDbPath)
    : defaultDbPath;
  db = new sqlite3.Database(dbPath);
  console.log('✓ Using Local SQLite Database Connection (' + dbPath + ')');
}

// Helper to convert SQLite SQL dialect to PostgreSQL dialect
function toPgSql(sql) {
  let paramIdx = 1;
  let pgSql = sql
    .replace(/\?/g, () => `$${paramIdx++}`)
    .replace(/DATETIME/gi, 'TIMESTAMPTZ')
    .replace(/CURRENT_TIMESTAMP/gi, 'NOW()')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'BIGSERIAL PRIMARY KEY');

  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(pgSql)) {
    pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(pgSql)) {
      pgSql += ' ON CONFLICT DO NOTHING';
    }
  }

  return pgSql;
}

// Initialize database schema
async function initializeDatabase() {
  if (isPostgres) {
    try {
      await pool.query('SELECT 1');
      console.log('✓ Connected to Supabase PostgreSQL successfully');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS multi_player_sessions (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT DEFAULT 'default',
          layout_type TEXT DEFAULT '2x2',
          active_players INTEGER DEFAULT 4,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

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

        CREATE TABLE IF NOT EXISTS player_slots (
          id BIGSERIAL PRIMARY KEY,
          session_id BIGINT NOT NULL,
          slot_number INTEGER NOT NULL,
          video_id BIGINT,
          playback_position REAL DEFAULT 0,
          is_playing BOOLEAN DEFAULT FALSE,
          volume INTEGER DEFAULT 50,
          playback_speed REAL DEFAULT 1.0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(session_id, slot_number)
        );

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
      `);

      await pool.query(`
        UPDATE player_slots SET video_id = NULL 
        WHERE video_id IS NOT NULL AND video_id NOT IN (SELECT id FROM videos)
      `);
      return;
    } catch (err) {
      console.error('✗ PostgreSQL initialization error:', err);
      throw err;
    }
  }

  // SQLite Schema Initialization
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS multi_player_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT DEFAULT 'default',
          layout_type TEXT DEFAULT '2x2',
          active_players INTEGER DEFAULT 4,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => { if (err) reject(err); }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS player_slots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          slot_number INTEGER NOT NULL,
          video_id INTEGER,
          playback_position REAL DEFAULT 0,
          is_playing BOOLEAN DEFAULT 0,
          volume INTEGER DEFAULT 50,
          playback_speed REAL DEFAULT 1.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES multi_player_sessions(id),
          UNIQUE(session_id, slot_number)
        )`,
        (err) => { if (err) reject(err); }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS videos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          youtube_id TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          thumbnail_url TEXT,
          duration INTEGER,
          platform TEXT DEFAULT 'youtube',
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) { reject(err); return; }
          db.run(`ALTER TABLE videos ADD COLUMN platform TEXT DEFAULT 'youtube'`, () => {});
        }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          default_layout TEXT DEFAULT '2x2',
          default_player_count INTEGER DEFAULT 4,
          default_volume INTEGER DEFAULT 50,
          default_playback_speed REAL DEFAULT 1.0,
          theme TEXT DEFAULT 'dark',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            reject(err);
          } else {
            db.run(
              `UPDATE player_slots SET video_id = NULL WHERE video_id IS NOT NULL AND video_id NOT IN (SELECT id FROM videos)`,
              () => resolve()
            );
          }
        }
      );
    });
  });
}

// Universal query runner helper
const run = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = toPgSql(sql);
    const res = await pool.query(pgSql, params);
    return { lastID: res.rows?.[0]?.id || 0, changes: res.rowCount };
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Universal get one row helper
const get = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = toPgSql(sql);
    const res = await pool.query(pgSql, params);
    return res.rows[0] || null;
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Universal get all rows helper
const all = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = toPgSql(sql);
    const res = await pool.query(pgSql, params);
    return res.rows;
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  db,
  pool,
  isPostgres,
  initializeDatabase,
  run,
  get,
  all
};
