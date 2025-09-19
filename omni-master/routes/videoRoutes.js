const express = require('express');
const router = express.Router();
const {
  generateVideo,
  getVideoJob,
  getVideoHistory,
  cancelVideoJob,
  getSupportedVideoOptions
} = require('../controllers/videoController');

// Import middleware
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

// All video routes require authentication
router.use(protect);

// Video generation routes (premium feature)
router.post('/generate', requirePremium, generateVideo);
router.get('/job/:id', getVideoJob);
router.get('/history', getVideoHistory);
router.post('/job/:id/cancel', cancelVideoJob);
router.get('/supported', getSupportedVideoOptions);

module.exports = router;
