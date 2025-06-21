const Message = require('../models/Message');

// @desc    Get all approved public messages
// @route   GET /api/messages
// @access  Private
exports.getPublicMessages = async (req, res) => {
  try {
    const messages = await Message.getAll({ approved: 1 });
    
    res.json({
      success: true,
      count: messages.length,
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

// @desc    Get all pending messages (admin only)
// @route   GET /api/messages/pending
// @access  Private/Admin
exports.getPendingMessages = async (req, res) => {
  try {
    const messages = await Message.getAll({ approved: 0 });
    
    res.json({
      success: true,
      count: messages.length,
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

// @desc    Create a new public message
// @route   POST /api/messages
// @access  Private
exports.createMessage = async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.create({
      content,
      sender: req.user.id,
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

// @desc    Approve a message (admin only)
// @route   PUT /api/messages/:id/approve
// @access  Private/Admin
exports.approveMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const message = await Message.approve(messageId, req.user.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
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

// @desc    Delete a message (admin only)
// @route   DELETE /api/messages/:id
// @access  Private/Admin
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const result = await Message.reject(messageId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
}; 