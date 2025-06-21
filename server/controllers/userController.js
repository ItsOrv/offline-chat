const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        ...user,
        isAdmin: user.isAdmin === 1 // Convert SQLite integer to Boolean
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        success: true,
        user: {
          ...userWithoutPassword,
          isAdmin: user.isAdmin === 1 // Convert SQLite integer to Boolean
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user by ID
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Update username if provided
    if (username && username !== user.username) {
      // TODO: Implement update username functionality
      // For now, we'll return an error because changing username requires more complex handling
      return res.status(400).json({
        success: false,
        message: 'Username change is not currently supported',
      });
    }
    
    // Update admin status if provided
    if (isAdmin !== undefined) {
      await User.updateRole(userId, isAdmin);
    }
    
    // If password is provided, update it
    if (password) {
      // TODO: Implement update password functionality
      // For now, we'll return an error
      return res.status(400).json({
        success: false,
        message: 'Password change is not currently supported',
      });
    }
    
    // Get updated user
    const updatedUser = await User.findById(userId);
    const { password: pwd, ...userWithoutPassword } = updatedUser;
    
    res.json({
      success: true,
      user: {
        ...userWithoutPassword,
        isAdmin: updatedUser.isAdmin === 1 // Convert SQLite integer to Boolean
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    // This functionality is not implemented in the SQLite version
    // It would require handling cascading deletes for all user data
    
    res.status(400).json({
      success: false,
      message: 'User deletion is not currently supported',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Search users by username
// @route   GET /api/users/search/:username
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    // This feature requires custom implementation for SQLite
    // For now, we'll return all users except the current user
    const allUsers = await User.getAll();
    
    // Filter by username if provided
    const username = req.params.username.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
      user.id !== req.user.id && // Exclude current user
      user.username.toLowerCase().includes(username) // Case-insensitive search
    );
    
    res.json({
      success: true,
      count: filteredUsers.length,
      users: filteredUsers.map(user => ({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin === 1,
        lastSeen: user.lastSeen
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
}; 