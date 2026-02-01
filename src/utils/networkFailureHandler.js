/**
 * Network Failure Handler
 * Handles offline/online states and failed requests
 */

import logger from './logger';

class NetworkFailureHandler {
  constructor() {
    this.isOnline = navigator.onLine;
    this.failedRequests = new Map();
    this.retryQueue = [];
    this.listeners = new Set();
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.maxRetryDelay = 30000; // Max 30 seconds
    
    this.setupEventListeners();
  }

  /**
   * Setup network event listeners
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      logger.info('🌐 Network connection restored');
      this.isOnline = true;
      this.notifyListeners('online');
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      logger.info('📡 Network connection lost');
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  /**
   * Add network status listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove network status listener
   * @param {Function} callback - Callback function
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of network status change
   * @param {string} status - Network status ('online' or 'offline')
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Network listener error:', error);
      }
    });
  }

  /**
   * Handle failed network request
   * @param {Function} requestFn - Function that makes the request
   * @param {Object} options - Request options
   * @returns {Promise} - Request promise with retry logic
   */
  async handleRequest(requestFn, options = {}) {
    const {
      id = this.generateRequestId(),
      priority = 'normal', // 'high', 'normal', 'low'
      showOfflineMessage = true,
      maxRetries = this.maxRetries,
      retryDelay = this.retryDelay
    } = options;

    try {
      // If offline, queue the request
      if (!this.isOnline) {
        return this.queueRequest(requestFn, { id, priority, showOfflineMessage, maxRetries, retryDelay });
      }

      // Attempt the request
      const result = await this.executeWithRetry(requestFn, { id, maxRetries, retryDelay });
      
      // Remove from failed requests if successful
      this.failedRequests.delete(id);
      
      return result;
    } catch (error) {
      // Handle network errors
      if (this.isNetworkError(error)) {
        logger.info(`📡 Network error detected for request ${id}`);
        return this.queueRequest(requestFn, { id, priority, showOfflineMessage, maxRetries, retryDelay, error });
      }
      
      // Re-throw non-network errors
      throw error;
    }
  }

  /**
   * Execute request with exponential backoff retry
   * @param {Function} requestFn - Request function
   * @param {Object} options - Retry options
   * @returns {Promise} - Request result
   */
  async executeWithRetry(requestFn, options = {}) {
    const { id, maxRetries = this.maxRetries, retryDelay = this.retryDelay } = options;
    let attempt = 0;
    let currentDelay = retryDelay;

    while (attempt <= maxRetries) {
      try {
        const result = await requestFn();
        
        if (attempt > 0) {
          logger.info(`✅ Request ${id} succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        attempt++;
        
        if (attempt > maxRetries || !this.isRetryableError(error)) {
          logger.error(`❌ Request ${id} failed after ${attempt} attempts:`, error);
          throw error;
        }
        
        logger.info(`⏳ Request ${id} failed, retrying in ${currentDelay}ms (attempt ${attempt}/${maxRetries})`);
        
        // Wait before retry with exponential backoff
        await this.sleep(currentDelay);
        currentDelay = Math.min(currentDelay * 2, this.maxRetryDelay);
      }
    }
  }

  /**
   * Queue request for later execution
   * @param {Function} requestFn - Request function
   * @param {Object} options - Queue options
   * @returns {Promise} - Promise that resolves when request is processed
   */
  queueRequest(requestFn, options = {}) {
    const { id, priority = 'normal', showOfflineMessage = true } = options;
    
    return new Promise((resolve, reject) => {
      const queueItem = {
        id,
        requestFn,
        options,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      };
      
      // Add to appropriate position based on priority
      if (priority === 'high') {
        this.retryQueue.unshift(queueItem);
      } else {
        this.retryQueue.push(queueItem);
      }
      
      // Store in failed requests for tracking
      this.failedRequests.set(id, {
        ...queueItem,
        status: 'queued'
      });
      
      if (showOfflineMessage) {
        this.notifyListeners('request_queued', { id, priority });
      }
      
      logger.info(`📥 Queued request ${id} (priority: ${priority}, queue size: ${this.retryQueue.length})`);
    });
  }

  /**
   * Process all queued requests when network is restored
   */
  async processRetryQueue() {
    if (this.retryQueue.length === 0) return;
    
    logger.info(`🔄 Processing ${this.retryQueue.length} queued requests`);
    
    // Sort queue by priority and timestamp
    this.retryQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // FIFO for same priority
    });
    
    const queue = [...this.retryQueue];
    this.retryQueue = [];
    
    // Process requests with some concurrency but not overwhelming
    const concurrency = 3;
    for (let i = 0; i < queue.length; i += concurrency) {
      const batch = queue.slice(i, i + concurrency);
      
      await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const result = await this.executeWithRetry(item.requestFn, item.options);
            this.failedRequests.delete(item.id);
            item.resolve(result);
          } catch (error) {
            this.failedRequests.set(item.id, { ...item, status: 'failed', error });
            item.reject(error);
          }
        })
      );
      
      // Small delay between batches to prevent overwhelming
      if (i + concurrency < queue.length) {
        await this.sleep(100);
      }
    }
    
    logger.info(`✅ Finished processing queued requests`);
  }

  /**
   * Check if error is a network error
   * @param {Error} error - Error object
   * @returns {boolean} - Whether it's a network error
   */
  isNetworkError(error) {
    const networkErrorMessages = [
      'network error',
      'failed to fetch',
      'timeout',
      'connection refused',
      'connection reset',
      'no internet',
      'offline'
    ];
    
    const errorMessage = (error.message || '').toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg)) ||
           error.name === 'NetworkError' ||
           error.code === 'NETWORK_ERROR';
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} - Whether error should be retried
   */
  isRetryableError(error) {
    // Network errors are retryable
    if (this.isNetworkError(error)) return true;
    
    // HTTP 5xx errors are retryable
    if (error.status >= 500 && error.status < 600) return true;
    
    // Rate limiting is retryable
    if (error.status === 429) return true;
    
    // Timeout errors are retryable
    if (error.status === 408) return true;
    
    return false;
  }

  /**
   * Generate unique request ID
   * @returns {string} - Unique ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Sleep promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current network status
   * @returns {Object} - Network status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      queuedRequests: this.retryQueue.length,
      failedRequests: this.failedRequests.size,
      canRetry: this.isOnline && (this.retryQueue.length > 0 || this.failedRequests.size > 0)
    };
  }

  /**
   * Manually retry failed requests
   */
  async retryFailedRequests() {
    const failedRequestsArray = Array.from(this.failedRequests.values())
      .filter(req => req.status === 'failed');
    
    if (failedRequestsArray.length === 0) {
      logger.info('No failed requests to retry');
      return;
    }
    
    logger.info(`🔄 Manually retrying ${failedRequestsArray.length} failed requests`);
    
    for (const item of failedRequestsArray) {
      this.queueRequest(item.requestFn, item.options);
    }
    
    if (this.isOnline) {
      await this.processRetryQueue();
    }
  }

  /**
   * Clear all queued and failed requests
   */
  clearQueue() {
    this.retryQueue.forEach(item => {
      item.reject(new Error('Request cancelled'));
    });
    
    this.retryQueue = [];
    this.failedRequests.clear();
    
    logger.info('🧹 Cleared request queue');
  }
}

// Create singleton instance
const networkFailureHandler = new NetworkFailureHandler();

export default networkFailureHandler;