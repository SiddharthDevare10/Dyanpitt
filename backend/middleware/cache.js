/**
 * Server-side caching middleware for API responses
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttlMs = 5 * 60 * 1000) { // Default 5 minutes
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the cache value
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired (double check)
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    // Remove from cache
    this.cache.delete(key);
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Invalidate cache entries matching pattern
  invalidatePattern(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }
}

// Singleton cache instance
const serverCache = new MemoryCache();

// Cache configuration for different endpoints
const CACHE_CONFIG = {
  // Cache for 30 minutes - rarely changing data
  LONG_CACHE: {
    ttl: 30 * 60 * 1000,
    patterns: ['/pricing', '/config', '/admin/stats']
  },
  
  // Cache for 5 minutes - moderately dynamic data  
  MEDIUM_CACHE: {
    ttl: 5 * 60 * 1000,
    patterns: ['/booking/all', '/admin/users', '/admin/bookings']
  },

  // Cache for 1 minute - frequently changing data
  SHORT_CACHE: {
    ttl: 60 * 1000,
    patterns: ['/auth/me', '/booking/user']
  },

  // No cache - always fresh data
  NO_CACHE: [
    '/auth/login',
    '/auth/register', 
    '/auth/logout',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/booking/create',
    '/booking/confirm'
  ]
};

// Get cache TTL for a given endpoint
function getCacheTTL(endpoint) {
  // Check if endpoint should not be cached
  if (CACHE_CONFIG.NO_CACHE.some(pattern => endpoint.includes(pattern))) {
    return 0;
  }

  // Check cache duration tiers
  for (const [tier, config] of Object.entries(CACHE_CONFIG)) {
    if (tier !== 'NO_CACHE' && config.patterns) {
      if (config.patterns.some(pattern => endpoint.includes(pattern))) {
        return config.ttl;
      }
    }
  }

  return 0; // Default no cache
}

// Generate cache key from request
function generateCacheKey(req) {
  const { method, originalUrl, user } = req;
  const userId = user?.userId || 'anonymous';
  
  // Include user ID for user-specific endpoints
  if (originalUrl.includes('/user/') || originalUrl.includes('/me')) {
    return `${method}:${originalUrl}:user:${userId}`;
  }
  
  return `${method}:${originalUrl}`;
}

// Cache middleware factory
function createCacheMiddleware(options = {}) {
  const { 
    keyGenerator = generateCacheKey,
    shouldCache = (req) => req.method === 'GET'
  } = options;

  return (req, res, next) => {
    // Only cache GET requests by default
    if (!shouldCache(req)) {
      return next();
    }

    const endpoint = req.originalUrl;
    const ttl = getCacheTTL(endpoint);

    // Skip caching if TTL is 0
    if (ttl === 0) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cachedData = serverCache.get(cacheKey);

    // Return cached data if available
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        serverCache.set(cacheKey, data, ttl);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', Math.floor(ttl / 1000));
      }
      
      return originalJson(data);
    };

    next();
  };
}

// Middleware to invalidate cache patterns
function invalidateCache(patterns) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // If operation was successful, invalidate related cache
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let invalidatedCount = 0;
        patterns.forEach(pattern => {
          invalidatedCount += serverCache.invalidatePattern(pattern);
        });
        
        if (invalidatedCount > 0) {
          res.setHeader('X-Cache-Invalidated', invalidatedCount);
        }
      }
      
      return originalJson(data);
    };

    next();
  };
}

// Cache management endpoints (for debugging)
function createCacheStatsEndpoint() {
  return (req, res) => {
    const stats = serverCache.getStats();
    res.json({
      success: true,
      cache: {
        ...stats,
        config: CACHE_CONFIG
      }
    });
  };
}

function createCacheClearEndpoint() {
  return (req, res) => {
    serverCache.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  };
}

module.exports = {
  serverCache,
  createCacheMiddleware,
  invalidateCache,
  createCacheStatsEndpoint,
  createCacheClearEndpoint,
  CACHE_CONFIG,
  getCacheTTL
};