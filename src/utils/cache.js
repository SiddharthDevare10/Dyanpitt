/**
 * Client-side caching utility
 * Reduces API calls and improves perceived performance
 */

import logger from './logger';

class Cache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Set a cache entry
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.timestamps.set(key, {
      created: Date.now(),
      ttl
    });
    logger.debug(`Cache set: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Get a cache entry
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/not found
   */
  get(key) {
    if (!this.has(key)) {
      return null;
    }

    const timestamp = this.timestamps.get(key);
    const age = Date.now() - timestamp.created;

    // Check if expired
    if (age > timestamp.ttl) {
      logger.debug(`Cache expired: ${key} (age: ${age}ms)`);
      this.delete(key);
      return null;
    }

    logger.debug(`Cache hit: ${key} (age: ${age}ms)`);
    return this.cache.get(key);
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete a cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, timestamp] of this.timestamps.entries()) {
      const age = now - timestamp.created;
      if (age > timestamp.ttl) {
        this.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      logger.debug(`Cleared ${clearedCount} expired cache entries`);
    }
    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Wrap an async function with caching
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to execute
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<*>}
   */
  async wrap(key, fn, ttl = this.defaultTTL) {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache wrap error for key ${key}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const cache = new Cache();

// Clear expired entries every 5 minutes
setInterval(() => {
  cache.clearExpired();
}, 5 * 60 * 1000);

export default cache;

/**
 * Cache key builders for common patterns
 */
export const cacheKeys = {
  user: (userId) => `user:${userId}`,
  booking: (bookingId) => `booking:${bookingId}`,
  bookings: (userId, page = 1) => `bookings:${userId}:page:${page}`,
  membership: (userId) => `membership:${userId}`,
  seats: (date, timeSlot) => `seats:${date}:${timeSlot}`,
  stats: (type) => `stats:${type}`,
  tourRequests: (email) => `tour:${email}`
};
