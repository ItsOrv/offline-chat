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
    
    let userChanged = false;

    // Update username if provided and different
    if (username && username.trim() !== '' && username !== user.username) {
      // Basic validation for username
      if (username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
      }
      try {
        await User.updateUsername(userId, username);
        userChanged = true;
      } catch (e) {
        if (e.message === 'Username is already taken') { // Specific error from model
          return res.status(409).json({ success: false, message: e.message }); // 409 Conflict
        }
        throw e; // Re-throw other errors to be caught by the main catch block
      }
    }
    
    // Update admin status if provided and different
    // isAdmin is boolean in req.body, user.isAdmin is 0 or 1 from DB prior to conversion
    const currentIsAdminBool = user.isAdmin === 1;
    if (isAdmin !== undefined && typeof isAdmin === 'boolean' && isAdmin !== currentIsAdminBool) {
      await User.updateRole(userId, isAdmin);
      userChanged = true;
    }
    
    // If password is provided, update it
    if (password && password.trim() !== '') {
       // Basic validation for password
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
      await User.updatePassword(userId, password);
      // Password change doesn't set userChanged = true because we don't refetch/show password
      // However, the user object is refetched, so updatedAt will be updated.
    }
    
    // Get updated user details if any relevant fields changed, or just to get latest updatedAt
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
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user.id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Admin users cannot delete themselves.',
      });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const result = await User.softDelete(userId);

    if (result) {
      // Optionally, could also invalidate user's JWT tokens here if a blacklist is implemented
      res.json({
        success: true,
        message: 'User soft deleted successfully',
      });
    } else {
      // This case should ideally not be hit if findById found the user,
      // unless there's a race condition or isDeleted was already 1.
      res.status(400).json({
        success: false,
        message: 'User could not be deleted or was already deleted.',
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

// @desc    Search users by username
// @route   GET /api/users/search/:username
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const searchTerm = req.params.username;
    const currentUserId = req.user.id;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.json({
        success: true,
        count: 0,
        users: [],
      });
    }

    const users = await User.searchByUsername(searchTerm, currentUserId);
    
    res.json({
      success: true,
      count: users.length,
      users: users, // Users are already formatted by the model method
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
}; 