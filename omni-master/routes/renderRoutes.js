const express = require('express');
const router = express.Router();
const {
  createRender,
  getRender
} = require('../controllers/renderController');
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/subscription');

router.post('/', protect, requirePremium, createRender);
router.get('/:id', protect, getRender);

module.exports = router;


