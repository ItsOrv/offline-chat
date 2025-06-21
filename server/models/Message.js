const db = require('../config/db');

class Message {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT m.*, u.username as senderUsername, ua.username as approvedByUsername 
        FROM messages m
        LEFT JOIN users u ON m.sender = u.id
        LEFT JOIN users ua ON m.approvedBy = ua.id
        WHERE m.id = ?
      `, [id], (err, row) => {
        if (err) return reject(err);
        if (row) {
          // Format message to include sender object
          row = {
            ...row,
            sender: {
              id: row.sender,
              username: row.senderUsername
            }
          };
        }
        resolve(row);
      });
    });
  }

  static getAll(options = {}) {
    return new Promise((resolve, reject) => {
      const { approved, limit = 100, offset = 0 } = options;
      
      let query = `
        SELECT m.*, u.username as senderUsername, ua.username as approvedByUsername 
        FROM messages m
        LEFT JOIN users u ON m.sender = u.id
        LEFT JOIN users ua ON m.approvedBy = ua.id
      `;
      
      const params = [];
      
      if (approved !== undefined) {
        query += ' WHERE m.approved = ?';
        params.push(approved ? 1 : 0);
      }
      
      query += ' ORDER BY m.createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        
        // Format messages to include sender object
        const formattedRows = rows.map(row => ({
          ...row,
          sender: {
            id: row.sender,
            username: row.senderUsername
          }
        }));
        
        resolve(formattedRows);
      });
    });
  }

  static create(messageData) {
    const { sender, content } = messageData;
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (sender, content, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
        [sender, content, now, now],
        function(err) {
          if (err) return reject(err);
          
          // Get the newly created message with sender info
          db.get(`
            SELECT m.*, u.username as senderUsername 
            FROM messages m
            LEFT JOIN users u ON m.sender = u.id
            WHERE m.id = ?
          `, [this.lastID], (err, row) => {
            if (err) return reject(err);
            
            // Format message to include sender object
            if (row) {
              row = {
                ...row,
                sender: {
                  id: row.sender,
                  username: row.senderUsername
                }
              };
            }
            
            resolve(row);
          });
        }
      );
    });
  }

  static approve(id, approvedBy) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE messages SET approved = 1, approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ?',
        [approvedBy, now, now, id],
        function(err) {
          if (err) return reject(err);
          if (this.changes === 0) return resolve(null);
          
          // Get the updated message with additional info
          db.get(`
            SELECT m.*, u.username as senderUsername, ua.username as approvedByUsername 
            FROM messages m
            LEFT JOIN users u ON m.sender = u.id
            LEFT JOIN users ua ON m.approvedBy = ua.id
            WHERE m.id = ?
          `, [id], (err, row) => {
            if (err) return reject(err);
            
            // Format message to include sender object
            if (row) {
              row = {
                ...row,
                sender: {
                  id: row.sender,
                  username: row.senderUsername
                },
                approvedBy: {
                  id: row.approvedBy,
                  username: row.approvedByUsername
                }
              };
            }
            
            resolve(row);
          });
        }
      );
    });
  }

  static reject(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM messages WHERE id = ? AND approved = 0', [id], function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }
}

module.exports = Message; 