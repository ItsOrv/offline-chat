const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username already exists
    const userExists = await User.findByUsername(username);

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    // Create new user
    const user = await User.create({
      username,
      password,
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin === 1, // Convert SQLite integer to Boolean
          token: generateToken(user.id),
        },
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

// @desc    Login a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username);

    // Check if user exists and password is correct
    if (user && (await User.comparePassword(password, user.password))) {
      // Update last seen
      await User.updateLastSeen(user.id);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin === 1, // Convert SQLite integer to Boolean
          token: generateToken(user.id),
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password',
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

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      // Don't send password back to client
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        success: true,
        user: {
          ...userWithoutPassword,
          isAdmin: user.isAdmin === 1, // Convert SQLite integer to Boolean
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