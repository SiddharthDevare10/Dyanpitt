/**
 * Centralized logging utility
 * Replaces console.log/error/warn with structured logging
 * In production, logs can be sent to external services like Sentry, LogRocket, etc.
 */

const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';

class Logger {
  constructor() {
    this.enabled = isDevelopment || isTest;
  }

  /**
   * Log informational messages (only in development)
   */
  info(message, ...args) {
    if (this.enabled) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages
   */
  warn(message, ...args) {
    if (this.enabled) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
    // In production, send to error tracking service
    this.sendToErrorService('warn', message, args);
  }

  /**
   * Log error messages
   */
  error(message, ...args) {
    console.error(`❌ [ERROR] ${message}`, ...args);
    // Always send errors to tracking service, even in production
    // Wrapped in try-catch to prevent recursion
    try {
      this.sendToErrorService('error', message, args);
    } catch {
      // Fail silently to prevent infinite loops
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, ...args) {
    if (this.enabled) {
      console.debug(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log success messages (only in development)
   */
  success(message, ...args) {
    if (this.enabled) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  /**
   * Send errors to external tracking service
   * TODO: Integrate with Sentry, LogRocket, or similar service
   */
  sendToErrorService(level, message) {
    // Skip if already handling an error to prevent recursion
    if (this._handlingError) return;
    
    if (!isDevelopment && !isTest) {
      this._handlingError = true;
      // In production, send to error tracking service
      // Example: Sentry.captureException(new Error(message));
      // For now, we'll just store it
      try {
        const errorLog = {
          level,
          message: String(message).substring(0, 500), // Limit size
          timestamp: new Date().toISOString(),
          userAgent: navigator?.userAgent || 'unknown',
          url: window?.location?.href || 'unknown'
        };
        
        // Could send to backend API endpoint for logging
        // fetch('/api/logs', { method: 'POST', body: JSON.stringify(errorLog) });
        
        // Store in sessionStorage for debugging
        const logs = JSON.parse(sessionStorage.getItem('errorLogs') || '[]');
        logs.push(errorLog);
        if (logs.length > 50) logs.shift(); // Keep only last 50 logs
        sessionStorage.setItem('errorLogs', JSON.stringify(logs));
      } catch {
        // Fail silently to avoid logging loops
      } finally {
        this._handlingError = false;
      }
    }
  }

  /**
   * Get stored error logs (for debugging)
   */
  getErrorLogs() {
    try {
      return JSON.parse(sessionStorage.getItem('errorLogs') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored error logs
   */
  clearErrorLogs() {
    sessionStorage.removeItem('errorLogs');
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
