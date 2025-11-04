const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db = null;

function getDatabase() {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'taghunter.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  initializeDatabase();

  return db;
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_type_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_type_id) REFERENCES game_types(id)
    );
  `);

  const gameTypesCount = db.prepare('SELECT COUNT(*) as count FROM game_types').get().count;

  if (gameTypesCount === 0) {
    seedData();
  }
}

function seedData() {
  const insertGameType = db.prepare('INSERT INTO game_types (name, description) VALUES (?, ?)');
  const insertScenario = db.prepare('INSERT INTO scenarios (game_type_id, title, description, difficulty, duration_minutes, image_url) VALUES (?, ?, ?, ?, ?, ?)');

  const gameTypes = [
    { name: 'Laser Tag', description: 'Fast-paced tactical combat with laser weapons' },
    { name: 'Airsoft', description: 'Military simulation using replica firearms' },
    { name: 'Paintball', description: 'Competitive shooting sport with paint-filled pellets' }
  ];

  const scenarios = [
    { game_type_id: 1, title: 'Team Deathmatch', description: 'Classic team vs team elimination', difficulty: 'Easy', duration_minutes: 15, image_url: 'https://images.pexels.com/photos/6389127/pexels-photo-6389127.jpeg' },
    { game_type_id: 1, title: 'Capture the Flag', description: 'Strategic objective-based gameplay', difficulty: 'Medium', duration_minutes: 20, image_url: 'https://images.pexels.com/photos/7433822/pexels-photo-7433822.jpeg' },
    { game_type_id: 1, title: 'VIP Escort', description: 'Protect or eliminate the VIP', difficulty: 'Hard', duration_minutes: 25, image_url: 'https://images.pexels.com/photos/6389097/pexels-photo-6389097.jpeg' },
    { game_type_id: 2, title: 'Urban Combat', description: 'Close quarters tactical scenarios', difficulty: 'Medium', duration_minutes: 30, image_url: 'https://images.pexels.com/photos/7045955/pexels-photo-7045955.jpeg' },
    { game_type_id: 2, title: 'Woodland Ops', description: 'Outdoor stealth and strategy', difficulty: 'Hard', duration_minutes: 45, image_url: 'https://images.pexels.com/photos/8092406/pexels-photo-8092406.jpeg' },
    { game_type_id: 2, title: 'Hostage Rescue', description: 'Extract hostages under fire', difficulty: 'Hard', duration_minutes: 35, image_url: 'https://images.pexels.com/photos/8092414/pexels-photo-8092414.jpeg' },
    { game_type_id: 3, title: 'Speedball', description: 'Fast-paced inflatable bunker gameplay', difficulty: 'Easy', duration_minutes: 10, image_url: 'https://images.pexels.com/photos/163444/sport-sports-paintball-army-163444.jpeg' },
    { game_type_id: 3, title: 'Woodsball', description: 'Natural terrain tactical play', difficulty: 'Medium', duration_minutes: 30, image_url: 'https://images.pexels.com/photos/1670723/pexels-photo-1670723.jpeg' },
    { game_type_id: 3, title: 'Scenario Game', description: 'Story-driven large-scale battles', difficulty: 'Hard', duration_minutes: 60, image_url: 'https://images.pexels.com/photos/2417842/pexels-photo-2417842.jpeg' }
  ];

  gameTypes.forEach(gt => {
    insertGameType.run(gt.name, gt.description);
  });

  scenarios.forEach(s => {
    insertScenario.run(s.game_type_id, s.title, s.description, s.difficulty, s.duration_minutes, s.image_url);
  });
}

module.exports = { getDatabase };
