/**
 * Simple request caching utility for API calls
 */

class RequestCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
  }

  // Generate cache key from URL and method
  generateKey(url, method = 'GET') {
    return `${method}:${url}`;
  }

  // Set cache with expiry
  set(url, method, data, ttlMs = 5 * 60 * 1000) { // Default 5 minutes
    const key = this.generateKey(url, method);
    const expiryTime = Date.now() + ttlMs;
    
    this.cache.set(key, data);
    this.cacheExpiry.set(key, expiryTime);
  }

  // Get from cache if not expired
  get(url, method = 'GET') {
    const key = this.generateKey(url, method);
    const expiryTime = this.cacheExpiry.get(key);
    
    // Check if cache exists and hasn't expired
    if (expiryTime && Date.now() < expiryTime) {
      return this.cache.get(key);
    }
    
    // Remove expired entry
    this.delete(key);
    return null;
  }

  // Delete specific cache entry
  delete(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Clear expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, expiryTime] of this.cacheExpiry.entries()) {
      if (now >= expiryTime) {
        this.delete(key);
      }
    }
  }

  // Invalidate cache for specific patterns (e.g., user data after update)
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
      }
    }
  }
}

// Cache configuration for different endpoints
export const CACHE_CONFIG = {
  // Don't cache these endpoints - always fetch fresh
  NO_CACHE: [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/auth/me',  // Always fetch fresh user data
    '/booking/user/me',  // Always fetch fresh booking data
    '/booking/user/active',  // Always fetch fresh active bookings
    '/booking-history/history',  // Always fetch fresh booking history
    '/booking/create',
    '/booking/confirm',
    '/booking/cash-payment'
  ],
  
  // Cache for 1 minute - frequently changing data
  SHORT_CACHE: [
    '/booking/all',
    '/admin/users',
    '/admin/bookings'
  ],
  
  // Cache for 5 minutes - moderately dynamic data
  MEDIUM_CACHE: [
    '/admin/stats',
    '/seats/available'
  ],
  
  // Cache for 30 minutes - rarely changing static data
  LONG_CACHE: [
    '/pricing',
    '/config',
    '/admin/analytics'
  ]
};

// Get cache TTL for endpoint
export const getCacheTTL = (endpoint) => {
  if (CACHE_CONFIG.NO_CACHE.some(pattern => endpoint.includes(pattern))) {
    return 0; // No cache
  }
  
  if (CACHE_CONFIG.SHORT_CACHE.some(pattern => endpoint.includes(pattern))) {
    return 1 * 60 * 1000; // 1 minute
  }
  
  if (CACHE_CONFIG.MEDIUM_CACHE.some(pattern => endpoint.includes(pattern))) {
    return 5 * 60 * 1000; // 5 minutes
  }
  
  if (CACHE_CONFIG.LONG_CACHE.some(pattern => endpoint.includes(pattern))) {
    return 30 * 60 * 1000; // 30 minutes
  }
  
  return 0; // Default no cache
};

// Singleton instance
const requestCache = new RequestCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  requestCache.cleanup();
}, 10 * 60 * 1000);

export default requestCache;