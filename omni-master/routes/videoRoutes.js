const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  generateVideoFromAvatar,
  getVideoJob,
  generateAvatarVideo,
  getVoiceList,
  getUserVideos,
  deleteUserVideo
} = require('../controllers/videoController');
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Video generation routes (updated API)
router.post('/generate', protect, requirePremium, generateAvatarVideo); // TTS mode
router.post('/generate-with-audio', protect, requirePremium, upload.single('audioFile'), generateAvatarVideo); // Audio upload mode

router.get('/job/:jobId', protect, getVideoJob);

// Legacy route (keep for compatibility)
router.post('/avatar/generate', protect, requirePremium, generateAvatarVideo);

// Get available TTS voices
router.get('/voices', protect, getVoiceList);

// User video management routes
router.get('/list', protect, getUserVideos); // Get user's videos with pagination
router.delete('/:videoId', protect, deleteUserVideo); // Delete a specific video

module.exports = router;
