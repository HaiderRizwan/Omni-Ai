const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadMiddleware, uploadToYouTube } = require('../controllers/youtubeController');
const { getXAuthUrl, handleXCallback, postTweet } = require('../controllers/xController');

router.post('/youtube/upload', protect, uploadMiddleware, uploadToYouTube);

// X (Twitter) routes
router.get('/x/auth-url', protect, getXAuthUrl);
router.get('/x/callback', protect, handleXCallback);
router.post('/x/tweet', protect, postTweet);

module.exports = router;


