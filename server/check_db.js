const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'videos.db');
const db = new sqlite3.Database(dbPath);

db.all(
  `SELECT ps.*, v.youtube_id, v.title, v.platform
   FROM player_slots ps
   LEFT JOIN videos v ON ps.video_id = v.id`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
    } else {
      console.log('PLAYER SLOTS AND JOINED VIDEOS:');
      console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
  }
);
