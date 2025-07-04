const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  searchUsers
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

// Admin routes
router.route('/')
  .get(protect, admin, getUsers);

// User search route (accessible to all authenticated users)
router.get('/search/:username', protect, searchUsers);

// Chat user route - accessible to all authenticated users
router.get('/chat/:id', protect, getUserById);

// Admin-only user management routes
router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router; 