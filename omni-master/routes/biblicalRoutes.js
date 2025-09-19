const express = require('express');
const router = express.Router();
const {
  verifyBiblicalAccuracy,
  getBiblicalText,
  getCommonReferences,
  analyzeBiblicalThemes
} = require('../controllers/biblicalController');

// Import middleware
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

// All biblical routes require authentication
router.use(protect);

// Biblical accuracy verification routes
router.post('/verify', verifyBiblicalAccuracy);
router.get('/text', getBiblicalText);
router.get('/common-references', getCommonReferences);
router.post('/analyze-themes', analyzeBiblicalThemes);

module.exports = router;
