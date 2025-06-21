const Message = require('./models/Message');
const PrivateMessage = require('./models/PrivateMessage');
const User = require('./models/User');

// Store online users - Export this map
const onlineUsers = new Map();

module.exports.onlineUsers = onlineUsers;

module.exports.initSocket = (io) => {
  // Track messages being processed to prevent duplicates
  const processingMessages = new Set();

  io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // User joins with their ID
    socket.on('user_connected', async (userId) => {
      try {
        if (!userId) {
          console.error('User connected with undefined userId', socket.id);
          return;
        }

        // Fetch minimal user details
        const user = await User.findById(userId); // findById already filters isDeleted
        if (user) {
          socket.userId = user.id.toString(); // Store userId on socket
          socket.isAdmin = user.isAdmin === 1; // Store isAdmin on socket

          // Add/update user in onlineUsers map
          onlineUsers.set(user.id.toString(), {
            socketId: socket.id,
            username: user.username,
            isAdmin: socket.isAdmin,
            id: user.id // also store id for convenience
          });

          // Prepare list of online users for emission
          const usersForClient = Array.from(onlineUsers.values()).map(u => ({
            id: u.id,
            username: u.username,
            isAdmin: u.isAdmin
          }));

          // Notify all connected clients about online users
          io.emit('online_users', usersForClient);
        } else {
          console.warn(`User with ID ${userId} not found or is deleted, for socket ${socket.id}`);
          // Optionally, disconnect or send an error to this specific socket
        }
      } catch (error) {
        console.error('Error handling user_connected event:', error);
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
        
        // Notify online admins about new message pending approval
        onlineUsers.forEach(adminUser => {
          if (adminUser.isAdmin && adminUser.socketId) {
            io.to(adminUser.socketId).emit('pending_approval', newMessage);
          }
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
        const newPrivateMessage = await PrivateMessage.create({ // This now returns the formatted message
          sender: message.sender,
          recipient: message.recipient,
          content: message.content
        });

        if (!newPrivateMessage) {
            // Handle case where message creation failed (e.g., model returned null)
            console.error('Failed to create private message in socket handler.');
            return socket.emit('message_error', { error: 'Failed to send message' });
        }
        
        // newPrivateMessage is already in the desired format:
        // { id, content, ..., sender: { id, username }, recipient: { id, username } }
        
        // Send to recipient if online
        const recipientSocketId = onlineUsers.get(message.recipient.toString()); // message.recipient is recipientId
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_private_message', newPrivateMessage);
        }
        
        // Confirm message sent to sender
        socket.emit('private_message_sent', newPrivateMessage);
      } catch (error) {
        console.error('Error sending private message:', error);
        socket.emit('message_error', { error: 'Error sending private message' });
      }
    });

    // Admin approves message
    socket.on('approve_message', async (messageId) => {
      try {
        if (!socket.userId || !socket.isAdmin) {
          return socket.emit('message_error', { error: 'Unauthorized: Not an admin or user ID missing on socket.' });
        }

        if (processingMessages.has(messageId)) {
          return;
        }
        processingMessages.add(messageId);
        
        const adminId = socket.userId; // Use userId from socket
        
        const message = await Message.approve(messageId, adminId);
        
        if (message) {
          io.emit('approved_message', message); // Broadcast to all
          
          // Notify all online admins to remove from their pending lists
          onlineUsers.forEach(adminUser => {
            if (adminUser.isAdmin && adminUser.socketId) {
              io.to(adminUser.socketId).emit('message_approved_admin_notification', messageId); // More specific event
            }
          });
        } else {
          socket.emit('message_error', { error: 'Message not found, already approved, or approval failed.' });
        }
      } catch (error) {
        console.error('Error approving message:', error);
        socket.emit('message_error', { error: 'Server error while approving message.' });
      } finally {
        processingMessages.delete(messageId); // Ensure cleanup
      }
    });

    // Admin rejects message
    socket.on('reject_message', async (messageId) => {
      try {
        if (!socket.userId || !socket.isAdmin) {
          return socket.emit('message_error', { error: 'Unauthorized: Not an admin or user ID missing on socket.' });
        }

        if (processingMessages.has(messageId)) {
          return;
        }
        processingMessages.add(messageId);

        // No need to fetch admin User object again, socket.isAdmin is source of truth here for the connected socket
        
        const result = await Message.reject(messageId); // Message.reject deletes the message
        
        if (result) {
          // Notify all online admins to remove from their pending lists
          onlineUsers.forEach(adminUser => {
            if (adminUser.isAdmin && adminUser.socketId) {
              io.to(adminUser.socketId).emit('message_rejected_admin_notification', messageId); // More specific event
            }
          });
           // Optionally, notify the original sender if they are online
           // This would require finding the original message to get senderId,
           // or having senderId as part of the reject_message payload.
        } else {
          socket.emit('message_error', { error: 'Message not found, already processed, or rejection failed.' });
        }
      } catch (error) {
        console.error('Error rejecting message:', error);
        socket.emit('message_error', { error: 'Server error while rejecting message.' });
      } finally {
        processingMessages.delete(messageId); // Ensure cleanup
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);

        // Prepare updated list of online users for emission
        const usersForClient = Array.from(onlineUsers.values()).map(u => ({
          id: u.id,
          username: u.username,
          isAdmin: u.isAdmin
        }));

        io.emit('online_users', usersForClient); // Emit the full updated list
        // Alternatively, emit just the disconnected userId: io.emit('user_disconnected', socket.userId);
        // Emitting the full list is simpler for clients to manage state.
        console.log('User disconnected:', socket.userId, socket.id);
      } else {
        console.log('A socket disconnected without a userId:', socket.id);
      }
    });
  });
}; 