// Currency utility functions

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'Fr',
  CNY: '¥',
  SEK: 'kr',
  NZD: 'NZ$',
  MXN: '$',
  SGD: 'S$',
  HKD: 'HK$',
  NOK: 'kr',
  KRW: '₩',
  TRY: '₺',
  RUB: '₽',
  INR: '₹',
  BRL: 'R$',
  ZAR: 'R',
  EGP: '£',
  PLN: 'zł',
  THB: '฿',
  IDR: 'Rp',
  CZK: 'Kč',
  ILS: '₪',
  PHP: '₱',
  MYR: 'RM',
  COP: '$',
  ARS: '$'
};

const CURRENCY_NAMES = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  SEK: 'Swedish Krona',
  NZD: 'New Zealand Dollar',
  MXN: 'Mexican Peso',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  NOK: 'Norwegian Krone',
  KRW: 'South Korean Won',
  TRY: 'Turkish Lira',
  RUB: 'Russian Ruble',
  INR: 'Indian Rupee',
  BRL: 'Brazilian Real',
  ZAR: 'South African Rand',
  EGP: 'Egyptian Pound',
  PLN: 'Polish Złoty',
  THB: 'Thai Baht',
  IDR: 'Indonesian Rupiah',
  CZK: 'Czech Koruna',
  ILS: 'Israeli Shekel',
  PHP: 'Philippine Peso',
  MYR: 'Malaysian Ringgit',
  COP: 'Colombian Peso',
  ARS: 'Argentine Peso'
};

// Format currency amount with symbol
const formatCurrency = (amount, currencyCode, locale = 'en-US') => {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting if currency code is not supported
    return `${symbol}${amount.toFixed(2)}`;
  }
};

// Get currency symbol
const getCurrencySymbol = (currencyCode) => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

// Get currency name
const getCurrencyName = (currencyCode) => {
  return CURRENCY_NAMES[currencyCode] || currencyCode;
};

// Validate currency code
const isValidCurrencyCode = (currencyCode) => {
  return currencyCode && typeof currencyCode === 'string' &&
         currencyCode.length === 3 && /^[A-Z]{3}$/.test(currencyCode);
};

// Calculate percentage change
const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

// Round to specified decimal places
const roundToDecimal = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Check if value is within reasonable range
const isValidExchangeRate = (rate) => {
  return rate > 0 && rate < 1000000 && !isNaN(rate) && isFinite(rate);
};

// Get popular currency pairs
const getPopularCurrencyPairs = () => {
  return [
    { from: 'USD', to: 'EUR', name: 'USD to EUR' },
    { from: 'USD', to: 'GBP', name: 'USD to GBP' },
    { from: 'USD', to: 'JPY', name: 'USD to JPY' },
    { from: 'EUR', to: 'USD', name: 'EUR to USD' },
    { from: 'EUR', to: 'GBP', name: 'EUR to GBP' },
    { from: 'GBP', to: 'USD', name: 'GBP to USD' },
    { from: 'GBP', to: 'EUR', name: 'GBP to EUR' },
    { from: 'USD', to: 'CAD', name: 'USD to CAD' },
    { from: 'USD', to: 'AUD', name: 'USD to AUD' },
    { from: 'USD', to: 'CHF', name: 'USD to CHF' }
  ];
};

// Convert between different timezones (for timestamp handling)
const convertTimestamp = (timestamp, fromTimezone = 'UTC', toTimezone = 'UTC') => {
  const date = new Date(timestamp);
  return date.getTime(); // For now, just return UTC timestamp
};

// Validate date format for historical rates
const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date.toISOString().split('T')[0] === dateString;
};

// Calculate compound exchange rate for multi-step conversions
const calculateCompoundRate = (rates, path) => {
  let rate = 1;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    if (rates[from] && rates[from][to]) {
      rate *= rates[from][to];
    } else {
      throw new Error(`Exchange rate not available: ${from} to ${to}`);
    }
  }
  return rate;
};

module.exports = {
  formatCurrency,
  getCurrencySymbol,
  getCurrencyName,
  isValidCurrencyCode,
  calculatePercentageChange,
  roundToDecimal,
  isValidExchangeRate,
  getPopularCurrencyPairs,
  convertTimestamp,
  isValidDateFormat,
  calculateCompoundRate,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES
};
