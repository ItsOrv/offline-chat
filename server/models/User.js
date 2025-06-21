const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, username, isAdmin, lastSeen, createdAt, updatedAt FROM users', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static async create(userData) {
    const { username, password, isAdmin = 0 } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password, isAdmin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, isAdmin, now, now],
        function(err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, username, isAdmin, createdAt: now, updatedAt: now });
        }
      );
    });
  }

  static updateLastSeen(id) {
    const now = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET lastSeen = ?, updatedAt = ? WHERE id = ?',
        [now, now, id],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  static updateRole(id, isAdmin) {
    const now = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET isAdmin = ?, updatedAt = ? WHERE id = ?',
        [isAdmin ? 1 : 0, now, id],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  static comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User; 