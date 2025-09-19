const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Import middleware (we'll create this next)
const { protect, authorize } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateUpdateProfile } = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);

// Protected routes (require authentication)
router.use(protect); // All routes below require authentication

router.get('/profile', getUserProfile);
router.put('/profile', validateUpdateProfile, updateUserProfile);

// Admin only routes
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', authorize('admin'), getUserById);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
