/**
 * Performance optimization utilities
 * Debouncing, throttling, and lazy loading helpers
 */

import logger from './logger';

/**
 * Debounce function - delays execution until after wait time
 * Useful for search inputs, form validation
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function - limits execution to once per wait time
 * Useful for scroll handlers, resize events
 */
export const throttle = (func, wait = 300) => {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
};

/**
 * Lazy load images when they come into viewport
 */
export const lazyLoadImage = (img) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target;
        const src = image.getAttribute('data-src');
        
        if (src) {
          image.src = src;
          image.removeAttribute('data-src');
          observer.unobserve(image);
          logger.debug('Lazy loaded image:', src);
        }
      }
    });
  }, {
    rootMargin: '50px' // Start loading 50px before entering viewport
  });
  
  observer.observe(img);
  return () => observer.unobserve(img);
};

/**
 * Measure component render time
 */
export const measureRenderTime = (componentName) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    
    if (duration > 16) { // Slower than 60fps
      logger.warn(`${componentName} rendered in ${duration.toFixed(2)}ms (slow)`);
    } else {
      logger.debug(`${componentName} rendered in ${duration.toFixed(2)}ms`);
    }
  };
};

/**
 * Batch multiple state updates
 */
export const batchUpdates = (updates) => {
  // React 18 automatically batches updates
  // This is a helper for explicit batching
  return Promise.resolve().then(() => {
    updates.forEach(update => update());
  });
};

/**
 * Preload critical resources
 */
export const preloadResource = (url, type = 'fetch') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  
  if (type === 'image') {
    link.as = 'image';
  } else if (type === 'script') {
    link.as = 'script';
  } else if (type === 'style') {
    link.as = 'style';
  } else {
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
  }
  
  document.head.appendChild(link);
  logger.debug(`Preloading resource: ${url}`);
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get device performance tier (low/medium/high)
 */
export const getDevicePerformanceTier = () => {
  const memory = navigator.deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 2;
  
  if (memory <= 2 || cores <= 2) {
    return 'low';
  } else if (memory <= 4 || cores <= 4) {
    return 'medium';
  }
  return 'high';
};

/**
 * Adaptive loading - adjust quality based on network speed
 */
export const getNetworkQuality = () => {
  if (!navigator.connection) {
    return 'unknown';
  }
  
  const connection = navigator.connection;
  const effectiveType = connection.effectiveType;
  
  if (effectiveType === '4g') {
    return 'high';
  } else if (effectiveType === '3g') {
    return 'medium';
  } else {
    return 'low';
  }
};

/**
 * Virtual scrolling helper for large lists
 */
export const calculateVisibleItems = (scrollTop, itemHeight, containerHeight, totalItems) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    Math.ceil((scrollTop + containerHeight) / itemHeight),
    totalItems
  );
  
  return {
    startIndex: Math.max(0, startIndex - 2), // Buffer above
    endIndex: Math.min(totalItems, endIndex + 2) // Buffer below
  };
};

export default {
  debounce,
  throttle,
  lazyLoadImage,
  measureRenderTime,
  batchUpdates,
  preloadResource,
  prefersReducedMotion,
  getDevicePerformanceTier,
  getNetworkQuality,
  calculateVisibleItems
};
