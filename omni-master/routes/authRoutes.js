const express = require('express');
const router = express.Router();
const { getAuthUrl, handleCallback, getGoogleProfile, debugGoogleConfig } = require('../controllers/googleAuthController');
const { protect } = require('../middleware/auth');

// Google OAuth
router.get('/google/url', getAuthUrl);
router.get('/google/callback', handleCallback);
router.get('/google/profile', protect, getGoogleProfile);
router.get('/google/debug', debugGoogleConfig);

module.exports = router;


