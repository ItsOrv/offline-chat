const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');

// @desc    Get private messages between users
// @route   GET /api/messages/private/:userId
// @access  Private
exports.getPrivateMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    // Check if the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get messages between current user and other user
    const messages = await PrivateMessage.getConversation(currentUserId, otherUserId);

    // Mark all unread messages from other user to current user as read
    await PrivateMessage.markAllAsRead(currentUserId, otherUserId);

    res.json({
      success: true,
      count: messages.length,
      recipient: otherUser.username,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Send a private message to another user
// @route   POST /api/messages/private
// @access  Private
exports.sendPrivateMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found',
      });
    }

    // Create message
    const message = await PrivateMessage.create({
      sender: req.user.id,
      recipient: recipientId,
      content,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all unread messages
// @route   GET /api/messages/private/unread
// @access  Private
exports.getUnreadMessages = async (req, res) => {
  try {
    const unreadCount = await PrivateMessage.getUnreadMessagesCount(req.user.id);
    
    // Get all user messages
    const messages = await PrivateMessage.getUserMessages(req.user.id);
    
    // Count messages by sender
    const messageCounts = {};
    messages.forEach((message) => {
      // Filter only unread messages where user is the recipient
      if (message.read === 0 && message.recipient === req.user.id) {
        const senderId = message.sender.toString();
        if (!messageCounts[senderId]) {
          messageCounts[senderId] = {
            id: message.sender,
            username: message.senderUsername,
            count: 0,
          };
        }
        messageCounts[senderId].count++;
      }
    });

    res.json({
      success: true,
      totalCount: unreadCount,
      messageCounts: Object.values(messageCounts),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user's conversations
// @route   GET /api/messages/private/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's conversations
    const conversations = await PrivateMessage.getUserConversations(userId);
    
    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
}; 