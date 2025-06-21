const express = require('express');
const router = express.Router();
const {
  getPublicMessages,
  getPendingMessages,
  createMessage,
  approveMessage,
  deleteMessage
} = require('../controllers/messageController');
const privateMessageController = require('../controllers/privateMessageController'); // Changed import
const { protect, admin } = require('../middleware/auth');

// Function to initialize routes with io instance
module.exports = function(io) {
  // Public chat routes
  router.route('/')
    .get(protect, getPublicMessages)
    .post(protect, createMessage); // Public messages are sent via socket, so this POST might be for initial creation before approval.

  // Admin routes for message moderation
  router.get('/pending', protect, admin, getPendingMessages);
  router.put('/:id/approve', protect, admin, approveMessage); // Approval might also trigger socket event.
  router.delete('/:id', protect, admin, deleteMessage);   // Deletion might also trigger socket event.

  // Private messaging routes
  router.get('/private/unread', protect, privateMessageController.getUnreadMessages);
  router.get('/private/conversations', protect, privateMessageController.getConversations);
  router.get('/private/:userId', protect, privateMessageController.getPrivateMessages);

  // Pass io to sendPrivateMessage handler
  router.post('/private', protect, (req, res) => privateMessageController.sendPrivateMessage(req, res, io));

  return router;
};