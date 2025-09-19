const express = require('express');
const router = express.Router();
const {
  getSupportedCurrencies,
  getExchangeRates,
  convertCurrency,
  getHistoricalRates,
  convertMultipleCurrencies
} = require('../controllers/currencyController');

// Import middleware
const { protect } = require('../middleware/auth');
const { checkUsageLimit } = require('../middleware/subscription');

// All currency routes are public (free tier feature)
// No authentication required for currency converter

// Public routes for currency conversion (free tier feature)
router.get('/supported', getSupportedCurrencies);
router.get('/rates', getExchangeRates);
router.get('/convert', convertCurrency);
router.get('/historical', getHistoricalRates);
router.post('/convert-multiple', convertMultipleCurrencies);

module.exports = router;
