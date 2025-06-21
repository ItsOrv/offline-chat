const db = require('../config/db');

class PrivateMessage {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT pm.*, 
               s.username as senderUsername, 
               r.username as recipientUsername 
        FROM privateMessages pm
        JOIN users s ON pm.sender = s.id
        JOIN users r ON pm.recipient = r.id
        WHERE pm.id = ?
      `, [id], (err, row) => {
        if (err) return reject(err);
        if (row) {
          const { sender, senderUsername, recipient, recipientUsername, ...messageData } = row;
          // Note: In this specific query, 'sender' and 'recipient' are already the IDs from pm.sender and pm.recipient.
          // So we rename them in the SELECT to avoid confusion if we were to select s.id as senderId etc.
          // For consistency, we'll use the field names as they come from the pm table directly for IDs.
          resolve({
            ...messageData,
            id: row.id, // ensure id is present
            sender: { id: row.sender, username: senderUsername },
            recipient: { id: row.recipient, username: recipientUsername }
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  static getConversation(user1Id, user2Id, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT pm.*, 
               s.username as senderUsername, 
               r.username as recipientUsername 
        FROM privateMessages pm
        JOIN users s ON pm.sender = s.id
        JOIN users r ON pm.recipient = r.id
        WHERE (pm.sender = ? AND pm.recipient = ?) OR (pm.sender = ? AND pm.recipient = ?)
        ORDER BY pm.createdAt DESC LIMIT ?
      `, [user1Id, user2Id, user2Id, user1Id, limit], (err, rows) => {
        if (err) return reject(err);
        // Format messages
        const formattedRows = rows.map(row => {
          const { sender, senderUsername, recipient, recipientUsername, ...messageData } = row;
          return {
            ...messageData, // id is already part of ...messageData from pm.*
            sender: { id: row.sender, username: senderUsername }, // row.sender is the ID from pm.sender
            recipient: { id: row.recipient, username: recipientUsername } // row.recipient is the ID from pm.recipient
          };
        });
        resolve(formattedRows);
      });
    });
  }

  static getUserMessages(userId, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT pm.*, 
               s.username as senderUsername, 
               r.username as recipientUsername 
        FROM privateMessages pm
        JOIN users s ON pm.sender = s.id
        JOIN users r ON pm.recipient = r.id
        WHERE pm.sender = ? OR pm.recipient = ?
        ORDER BY pm.createdAt DESC LIMIT ?
      `, [userId, userId, limit], (err, rows) => {
        if (err) return reject(err);
        // Format messages
        const formattedRows = rows.map(row => {
          const { sender, senderUsername, recipient, recipientUsername, ...messageData } = row;
          return {
            ...messageData,
            sender: { id: row.sender, username: senderUsername },
            recipient: { id: row.recipient, username: recipientUsername }
          };
        });
        resolve(formattedRows);
      });
    });
  }

  static getUserConversations(userId, limit = 20) {
    return new Promise((resolve, reject) => {
      // Get the most recent message from each conversation
      db.all(`
        WITH LastMessages AS (
          SELECT 
            CASE 
              WHEN pm.sender = ? THEN pm.recipient
              ELSE pm.sender
            END as otherUserId,
            MAX(pm.createdAt) as lastMessageTime
          FROM privateMessages pm
          WHERE pm.sender = ? OR pm.recipient = ?
          GROUP BY otherUserId
        )
        SELECT 
          lm.otherUserId as userId,
          u.username,
          lm.lastMessageTime,
          (
            SELECT COUNT(*) 
            FROM privateMessages 
            WHERE recipient = ? AND sender = lm.otherUserId AND read = 0
          ) as unreadCount
        FROM LastMessages lm
        JOIN users u ON u.id = lm.otherUserId
        ORDER BY lm.lastMessageTime DESC
        LIMIT ?
      `, [userId, userId, userId, userId, limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getUnreadMessagesCount(userId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as unreadCount 
        FROM privateMessages 
        WHERE recipient = ? AND read = 0
      `, [userId], (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.unreadCount : 0);
      });
    });
  }

  static create(messageData) {
    const { sender, recipient, content } = messageData;
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO privateMessages (sender, recipient, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [sender, recipient, content, now, now],
        function(err) {
          if (err) return reject(err);
          
          // Get the newly created message with sender and recipient info
          db.get(`
            SELECT pm.*, 
                   s.id as senderId, s.username as senderUsername,
                   r.id as recipientId, r.username as recipientUsername
            FROM privateMessages pm
            JOIN users s ON pm.sender = s.id
            JOIN users r ON pm.recipient = r.id
            WHERE pm.id = ?
          `, [this.lastID], (err, row) => {
            if (err) return reject(err);
            if (row) {
              const { senderId, senderUsername, recipientId, recipientUsername, ...messageData } = row;
              resolve({
                ...messageData,
                sender: { id: senderId, username: senderUsername },
                recipient: { id: recipientId, username: recipientUsername }
              });
            } else {
              resolve(null);
            }
          });
        }
      );
    });
  }

  static markAsRead(id) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE privateMessages SET read = 1, readAt = ?, updatedAt = ? WHERE id = ?',
        [now, now, id],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  static markAllAsRead(recipientId, senderId) {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE privateMessages SET read = 1, readAt = ?, updatedAt = ? WHERE recipient = ? AND sender = ? AND read = 0',
        [now, now, recipientId, senderId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  }
}

module.exports = PrivateMessage; 