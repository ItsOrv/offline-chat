const sqlite3 = require('sqlite3').verbose();
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Ensure the directory for the database file exists
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Database directory created: ${dbDir}`);
  } catch (mkdirErr) {
    console.error(`Error creating database directory ${dbDir}:`, mkdirErr);
    // Exit or handle critical error appropriately if directory creation fails
    process.exit(1);
  }
}

// Create database connection
const db = new sqlite3.Database(config.DB_PATH, (err) => {
  if (err) {
    console.error(`Error connecting to SQLite database at ${config.DB_PATH}:`, err.message);
  } else {
    console.log(`Connected to SQLite database at ${config.DB_PATH}`);
    initializeDatabase();
  }
});

// Create required tables
const initializeDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      isAdmin INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0, -- Added isDeleted column
      lastSeen TEXT DEFAULT CURRENT_TIMESTAMP,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Public messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER NOT NULL,
      content TEXT NOT NULL,
      approved INTEGER DEFAULT 0,
      approvedBy INTEGER,
      approvedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender) REFERENCES users(id),
      FOREIGN KEY (approvedBy) REFERENCES users(id)
    )`);

    // Private messages table
    db.run(`CREATE TABLE IF NOT EXISTS privateMessages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER NOT NULL,
      recipient INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      readAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender) REFERENCES users(id),
      FOREIGN KEY (recipient) REFERENCES users(id)
    )`);
  });
};

module.exports = db; 