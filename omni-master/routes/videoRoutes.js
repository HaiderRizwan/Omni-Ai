const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  generateVideoFromAvatar,
  getVideoJob,
  generateAvatarVideo,
  getVoiceList
} = require('../controllers/videoController');
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', protect, requirePremium, generateVideoFromAvatar);

router.get('/job/:jobId', protect, getVideoJob);

// New avatar-to-video generation routes
router.post('/avatar/generate', protect, requirePremium, generateAvatarVideo);

// Get available TTS voices
router.get('/voices', protect, getVoiceList);

module.exports = router;
