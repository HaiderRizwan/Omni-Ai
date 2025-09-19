const express = require('express');
const router = express.Router();
const {
  createCharacter,
  getCharacters,
  getCharacter,
  updateCharacter,
  deleteCharacter,
  generateCharacterImage,
  getCharacterStats,
  duplicateCharacter
} = require('../controllers/characterController');

// Import middleware
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

// All character routes require authentication
router.use(protect);

// Character CRUD routes
router.post('/', createCharacter);
router.get('/', getCharacters);
router.get('/:id', getCharacter);
router.put('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);

// Character-specific routes
router.post('/:id/generate-image', requirePremium, generateCharacterImage);
router.get('/:id/stats', getCharacterStats);
router.post('/:id/duplicate', duplicateCharacter);

module.exports = router;
