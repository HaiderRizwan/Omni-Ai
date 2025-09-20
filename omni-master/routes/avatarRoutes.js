const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  generateAvatar,
  generateAvatarFromImage,
  getAvatarJob,
  getUserAvatars,
  getA2ECompatibleAvatars,
  getAvatar,
  deleteAvatar,
  serveAvatar,
  saveImageToAvatars,
  migrateAvatarsToA2E,
  testAvatarGeneration
} = require('../controllers/avatarController');
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');
const Avatar = require('../models/Avatar');

// Multer setup for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// @route   POST /api/avatars/generate
// @desc    Generate a new avatar from text
// @access  Private (Premium)
router.post('/generate', protect, requirePremium, generateAvatar);

// @route   POST /api/avatars/generate-from-image
// @desc    Generate a new avatar from an image
// @access  Private (Premium)
router.post('/generate-from-image', protect, requirePremium, upload.single('avatarImage'), generateAvatarFromImage);

// @route   POST /api/avatars/migrate-to-a2e
// @desc    Make existing avatars A2.E compatible
// @access  Private
router.post('/migrate-to-a2e', protect, migrateAvatarsToA2E);

// @route   POST /api/avatars/test
// @desc    Test avatar generation system
// @access  Private
router.post('/test', protect, testAvatarGeneration);

// @route   GET /api/avatars/job/:jobId
// @desc    Get avatar generation job status
// @access  Private
router.get('/job/:jobId', protect, getAvatarJob);

// @route   GET /api/avatars/a2e-compatible
// @desc    Get A2E-compatible avatars for video generation
// @access  Private
router.get('/a2e-compatible', protect, getA2ECompatibleAvatars);

// @route   GET /api/avatars
// @desc    Get user's avatars (supports ?a2eCompatible=true filter)
// @access  Private
router.get('/', protect, getUserAvatars);

// @route   GET /api/avatars/:id
// @desc    Get single avatar
// @access  Private
router.get('/:id', protect, getAvatar);

// @route   DELETE /api/avatars/:id
// @desc    Delete avatar
// @access  Private
router.delete('/:id', protect, deleteAvatar);

// @route   POST /api/avatars/save-from-image
// @desc    Save image from images collection to avatars collection
// @access  Private
router.post('/save-from-image', protect, saveImageToAvatars);

// @route   GET /api/avatars/public/:id
// @desc    Serve avatar image (public)
// @access  Public
router.get('/public/:id', serveAvatar);

// @route   GET /api/avatars/health/:id
// @desc    Check avatar health (public)
// @access  Public
router.get('/health/:id', async (req, res) => {
  try {
    const avatar = await Avatar.findById(req.params.id);
    
    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: avatar._id,
        hasImageData: !!avatar.imageData,
        contentType: avatar.contentType,
        size: avatar.size,
        createdAt: avatar.createdAt,
        user: avatar.user,
        metadata: avatar.metadata
      }
    });
  } catch (error) {
    console.error('Avatar health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check avatar health',
      error: error.message
    });
  }
});
router.options('/public/:id', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).end();
});

module.exports = router;


