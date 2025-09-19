const axios = require('axios');
const exchangeRateCache = require('../utils/exchangeRateCache');

// Supported currencies
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
  'EGP', 'PLN', 'THB', 'IDR', 'CZK', 'ILS', 'PHP', 'MYR', 'COP', 'ARS'
];

// @desc    Get all supported currencies
// @route   GET /api/currency/supported
// @access  Public
const getSupportedCurrencies = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        currencies: SUPPORTED_CURRENCIES,
        count: SUPPORTED_CURRENCIES.length
      }
    });
  } catch (error) {
    console.error('Get supported currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported currencies',
      error: error.message
    });
  }
};

// @desc    Get current exchange rates
// @route   GET /api/currency/rates
// @access  Public
const getExchangeRates = async (req, res) => {
  try {
    const { base = 'USD' } = req.query;

    const cacheKey = `rates_${base.toUpperCase()}`;

    const result = await exchangeRateCache.getOrSet(
      cacheKey,
      () => fetchExchangeRates(base),
      60 * 60 * 1000 // 1 hour cache
    );

    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        cached: result.cached,
        stale: result.stale || false
      }
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rates',
      error: error.message
    });
  }
};

// @desc    Convert currency
// @route   GET /api/currency/convert
// @access  Public
const convertCurrency = async (req, res) => {
  try {
    const { from, to, amount } = req.query;

    // Validation
    if (!from || !to || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: from, to, amount'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    if (!SUPPORTED_CURRENCIES.includes(from.toUpperCase()) ||
        !SUPPORTED_CURRENCIES.includes(to.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency code'
      });
    }

    // Convert currencies
    const result = await convertCurrencies(from.toUpperCase(), to.toUpperCase(), amountNum);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Convert currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
};

// @desc    Get historical exchange rates
// @route   GET /api/currency/historical
// @access  Public
const getHistoricalRates = async (req, res) => {
  try {
    const { date, base = 'USD' } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required (YYYY-MM-DD format)'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const rates = await fetchHistoricalRates(date, base);

    res.status(200).json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Get historical rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical rates',
      error: error.message
    });
  }
};

// @desc    Get currency conversion with multiple targets
// @route   POST /api/currency/convert-multiple
// @access  Public
const convertMultipleCurrencies = async (req, res) => {
  try {
    const { from, amount, to } = req.body;

    if (!from || !amount || !to || !Array.isArray(to)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: from, amount, to (array)'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    if (!SUPPORTED_CURRENCIES.includes(from.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported source currency'
      });
    }

    // Validate target currencies
    const invalidCurrencies = to.filter(currency =>
      !SUPPORTED_CURRENCIES.includes(currency.toUpperCase())
    );

    if (invalidCurrencies.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unsupported target currencies: ${invalidCurrencies.join(', ')}`
      });
    }

    // Convert to all target currencies
    const conversions = await Promise.all(
      to.map(async (targetCurrency) => {
        const result = await convertCurrencies(from.toUpperCase(), targetCurrency.toUpperCase(), amountNum);
        return {
          to: targetCurrency.toUpperCase(),
          ...result
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        from: from.toUpperCase(),
        amount: amountNum,
        conversions
      }
    });
  } catch (error) {
    console.error('Convert multiple currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currencies',
      error: error.message
    });
  }
};

// Helper function to fetch exchange rates from API
const fetchExchangeRates = async (base = 'USD') => {
  try {
    // Using open.er-api.com free endpoint for latest rates (no API key required)
    const response = await axios.get(`https://open.er-api.com/v6/latest/${base}`, {
      timeout: 10000 // 10 second timeout
    });

    if (response.data && response.data.rates) {
      const lastUpdateUnix = response.data.time_last_update_unix || Date.now() / 1000;
      return {
        base: response.data.base_code || base,
        date: new Date(lastUpdateUnix * 1000).toISOString().split('T')[0],
        rates: response.data.rates,
        timestamp: Date.now()
      };
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Exchange rate API error:', error.response?.data || error.message);
    // Do not attempt manual cache fallback here; getOrSet handles stale cache return
    throw new Error('Unable to fetch exchange rates');
  }
};

// Helper function to convert currencies
const convertCurrencies = async (from, to, amount) => {
  try {
    const cacheKey = `rates_${from}`;
    const usdCacheKey = 'rates_USD';

    // Try to get rates with the 'from' currency as base
    let ratesResult = await exchangeRateCache.getOrSet(
      cacheKey,
      () => fetchExchangeRates(from),
      60 * 60 * 1000 // 1 hour cache
    );

    let rates = ratesResult.data;

    if (from === rates.base || from === rates.base_code) {
      const rate = rates.rates[to];
      if (!rate) {
        throw new Error(`Exchange rate not available for ${to}`);
      }

      const convertedAmount = amount * rate;
      return {
        from,
        to,
        amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        rate,
        lastUpdated: rates.timestamp,
        cached: ratesResult.cached
      };
    } else {
      // Convert through USD as base
      const usdRatesResult = await exchangeRateCache.getOrSet(
        usdCacheKey,
        () => fetchExchangeRates('USD'),
        60 * 60 * 1000 // 1 hour cache
      );

      const usdRates = usdRatesResult.data;
      const fromRate = usdRates.rates[from];
      const toRate = usdRates.rates[to];

      if (!fromRate || !toRate) {
        throw new Error(`Exchange rate not available for conversion`);
      }

      const amountInUSD = amount / fromRate;
      const convertedAmount = amountInUSD * toRate;

      return {
        from,
        to,
        amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        rate: toRate / fromRate,
        lastUpdated: usdRates.timestamp,
        cached: usdRatesResult.cached
      };
    }
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
};

// Helper function to fetch historical rates (free provider)
const fetchHistoricalRates = async (date, base = 'USD') => {
  try {
    // Use exchangerate.host for historical by date (no API key required)
    const response = await axios.get(`https://api.exchangerate.host/${date}?base=${encodeURIComponent(base)}`, {
      timeout: 10000
    });

    if (response.data && response.data.rates) {
      return {
        date,
        base: response.data.base || base,
        rates: response.data.rates,
        timestamp: Date.now()
      };
    } else {
      throw new Error('Historical data not available for this date');
    }
  } catch (error) {
    console.error('Historical rates API error:', error.response?.data || error.message);
    throw new Error('Historical exchange rates not available');
  }
};

module.exports = {
  getSupportedCurrencies,
  getExchangeRates,
  convertCurrency,
  getHistoricalRates,
  convertMultipleCurrencies
};
