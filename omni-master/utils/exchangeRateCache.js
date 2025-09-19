const axios = require('axios');

// In-memory cache for exchange rates
class ExchangeRateCache {
  constructor() {
    this.cache = new Map();
    this.defaultCacheDuration = 60 * 60 * 1000; // 1 hour
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes

    // Start cleanup interval
    this.startCleanup();
  }

  // Get cached data
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.duration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Set cached data
  set(key, data, duration = this.defaultCacheDuration) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }

  // Check if key exists and is valid
  has(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;

    if (Date.now() - cached.timestamp > cached.duration) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Get or set (cache miss handler)
  async getOrSet(key, fetcher, duration = this.defaultCacheDuration) {
    // Check cache first
    if (this.has(key)) {
      return {
        data: this.get(key),
        cached: true
      };
    }

    // Fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data, duration);
      return {
        data,
        cached: false
      };
    } catch (error) {
      // If fetch fails and we have stale data, return it
      const staleData = this.cache.get(key);
      if (staleData) {
        console.log(`Using stale cache data for ${key} due to API error`);
        return {
          data: staleData.data,
          cached: true,
          stale: true
        };
      }
      throw error;
    }
  }

  // Clear specific key
  clear(key) {
    return this.cache.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let totalEntries = 0;
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache) {
      totalEntries++;
      if (now - value.timestamp > value.duration) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      cacheSize: this.cache.size
    };
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache) {
      if (now - value.timestamp > value.duration) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  // Start automatic cleanup
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Stop automatic cleanup
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Create singleton instance
const exchangeRateCache = new ExchangeRateCache();

module.exports = exchangeRateCache;
