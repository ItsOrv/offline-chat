const Message = require('./models/Message');
const PrivateMessage = require('./models/PrivateMessage');
const User = require('./models/User');

module.exports = (io) => {
  // Store online users
  const onlineUsers = new Map();
  // Track messages being processed to prevent duplicates
  const processingMessages = new Set();

  io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // User joins with their ID
    socket.on('user_connected', async (userId) => {
      try {
        // Add user to online users map
        onlineUsers.set(userId.toString(), socket.id);
        
        // Get all online users
        const onlineUserIds = Array.from(onlineUsers.keys());
        const users = [];
        
        // Fetch user info for each online user
        for (const id of onlineUserIds) {
          const user = await User.findById(id);
          if (user) {
            const { password, ...userWithoutPassword } = user;
            users.push({
              ...userWithoutPassword,
              isAdmin: user.isAdmin === 1
            });
          }
        }
        
        // Notify all connected clients about online users
        io.emit('online_users', users);
      } catch (error) {
        console.error('Error handling user connection:', error);
      }
    });

    // Send message to public chat
    socket.on('send_public_message', async (message) => {
      try {
        // Save message to database as pending
        const newMessage = await Message.create({
          sender: message.sender,
          content: message.content
        });
        
        // Get admin socket IDs
        const adminSockets = [];
        for (const [userId, socketId] of onlineUsers.entries()) {
          const user = await User.findById(userId);
          if (user && user.isAdmin === 1) {
            adminSockets.push(socketId);
          }
        }
        
        // Notify admins about new message pending approval
        adminSockets.forEach(socketId => {
          io.to(socketId).emit('pending_approval', newMessage);
        });
        
        // Acknowledge the sender that message was sent for approval
        socket.emit('message_sent_for_approval', newMessage.id);
      } catch (error) {
        console.error('Error sending public message:', error);
        socket.emit('message_error', { error: 'Error sending message' });
      }
    });

    // Send private message
    socket.on('send_private_message', async (message) => {
      try {
        // Get sender and recipient info for better message display
        const sender = await User.findById(message.sender);
        const recipient = await User.findById(message.recipient);
        
        if (!sender || !recipient) {
          return socket.emit('message_error', { error: 'Invalid sender or recipient' });
        }
        
        // Save private message to database
        const newPrivateMessage = await PrivateMessage.create({
          sender: message.sender,
          recipient: message.recipient,
          content: message.content
        });
        
        // Enhance message with user info
        const enhancedMessage = {
          ...newPrivateMessage,
          senderId: message.sender,
          recipientId: message.recipient,
          senderUsername: sender.username,
          recipientUsername: recipient.username
        };
        
        // Send to recipient if online
        const recipientSocketId = onlineUsers.get(message.recipient.toString());
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_private_message', enhancedMessage);
        }
        
        // Confirm message sent to sender
        socket.emit('private_message_sent', enhancedMessage);
      } catch (error) {
        console.error('Error sending private message:', error);
        socket.emit('message_error', { error: 'Error sending private message' });
      }
    });

    // Admin approves message
    socket.on('approve_message', async (messageId) => {
      try {
        // Check if message is already being processed
        if (processingMessages.has(messageId)) {
          return; // Skip if already processing this message
        }
        
        // Add to processing set
        processingMessages.add(messageId);
        
        // Get user ID from socket
        let adminId = null;
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            adminId = userId;
            break;
          }
        }
        
        if (!adminId) {
          processingMessages.delete(messageId);
          return socket.emit('message_error', { error: 'Unauthorized access' });
        }
        
        // Approve message
        const message = await Message.approve(messageId, adminId);
        
        if (message) {
          // Broadcast approved message to all users
          io.emit('approved_message', message);
          
          // Notify all admins to remove from pending
          for (const [userId, socketId] of onlineUsers.entries()) {
            const user = await User.findById(userId);
            if (user && user.isAdmin === 1) {
              io.to(socketId).emit('message_rejected', messageId);
            }
          }
        } else {
          // Message not found or already approved
          socket.emit('message_error', { error: 'Message not found or already approved' });
        }
        
        // Remove from processing set after a delay to prevent race conditions
        setTimeout(() => {
          processingMessages.delete(messageId);
        }, 1000);
      } catch (error) {
        processingMessages.delete(messageId);
        console.error('Error approving message:', error);
        socket.emit('message_error', { error: 'Error approving message' });
      }
    });

    // Admin rejects message
    socket.on('reject_message', async (messageId) => {
      try {
        // Check if message is already being processed
        if (processingMessages.has(messageId)) {
          return; // Skip if already processing this message
        }
        
        // Add to processing set
        processingMessages.add(messageId);
        
        // Get user ID for verification
        let adminId = null;
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            adminId = userId;
            break;
          }
        }
        
        if (!adminId) {
          processingMessages.delete(messageId);
          return socket.emit('message_error', { error: 'Unauthorized access' });
        }
        
        // Verify user is an admin
        const admin = await User.findById(adminId);
        if (!admin || admin.isAdmin !== 1) {
          processingMessages.delete(messageId);
          return socket.emit('message_error', { error: 'Unauthorized access' });
        }
        
        const result = await Message.reject(messageId);
        if (result) {
          // Notify all admins to remove from pending
          for (const [userId, socketId] of onlineUsers.entries()) {
            const user = await User.findById(userId);
            if (user && user.isAdmin === 1) {
              io.to(socketId).emit('message_rejected', messageId);
            }
          }
        } else {
          socket.emit('message_error', { error: 'Message not found or already processed' });
        }
        
        // Remove from processing set after a delay to prevent race conditions
        setTimeout(() => {
          processingMessages.delete(messageId);
        }, 1000);
      } catch (error) {
        processingMessages.delete(messageId);
        console.error('Error rejecting message:', error);
        socket.emit('message_error', { error: 'Error rejecting message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Find and remove the disconnected user
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      
      // Update online users list for all clients
      io.emit('user_disconnected', socket.id);
      console.log('User disconnected:', socket.id);
    });
  });
}; 