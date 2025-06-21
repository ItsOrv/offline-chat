const express = require('express');
const router = express.Router();
const { 
  getPublicMessages, 
  getPendingMessages, 
  createMessage, 
  approveMessage, 
  deleteMessage 
} = require('../controllers/messageController');
const {
  getPrivateMessages,
  sendPrivateMessage,
  getUnreadMessages,
  getConversations
} = require('../controllers/privateMessageController');
const { protect, admin } = require('../middleware/auth');

// Public chat routes
router.route('/')
  .get(protect, getPublicMessages)
  .post(protect, createMessage);

// Admin routes for message moderation
router.get('/pending', protect, admin, getPendingMessages);
router.put('/:id/approve', protect, admin, approveMessage);
router.delete('/:id', protect, admin, deleteMessage);

// Private messaging routes
router.get('/private/unread', protect, getUnreadMessages);
router.get('/private/conversations', protect, getConversations);
router.get('/private/:userId', protect, getPrivateMessages);
router.post('/private', protect, sendPrivateMessage);

module.exports = router; 