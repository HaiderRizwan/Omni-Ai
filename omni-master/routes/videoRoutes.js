const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  generateVideoFromAvatar,
  getVideoJob
} = require('../controllers/videoController');
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', protect, requirePremium, generateVideoFromAvatar);

router.get('/job/:jobId', protect, getVideoJob);

module.exports = router;
