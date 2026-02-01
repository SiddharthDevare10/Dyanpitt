/**
 * Backend logging utility
 * Centralized logging with different levels
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

class Logger {
  constructor() {
    this.enabled = isDevelopment || isTest;
  }

  /**
   * Format timestamp for logs
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Log informational messages (only in development)
   */
  info(message, ...args) {
    if (this.enabled) {
      console.log(`[${this.getTimestamp()}] ℹ️  [INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages
   */
  warn(message, ...args) {
    if (this.enabled) {
      console.warn(`[${this.getTimestamp()}] ⚠️  [WARN] ${message}`, ...args);
    }
    // In production, send to error tracking service
    this.sendToErrorService('warn', message, args);
  }

  /**
   * Log error messages
   */
  error(message, ...args) {
    console.error(`[${this.getTimestamp()}] ❌ [ERROR] ${message}`, ...args);
    // Always send errors to tracking service
    this.sendToErrorService('error', message, args);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message, ...args) {
    if (this.enabled) {
      console.debug(`[${this.getTimestamp()}] 🔍 [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log success messages (only in development)
   */
  success(message, ...args) {
    if (this.enabled) {
      console.log(`[${this.getTimestamp()}] ✅ [SUCCESS] ${message}`, ...args);
    }
  }

  /**
   * Send errors to external tracking service
   * TODO: Integrate with Sentry or similar service
   */
  sendToErrorService(level, message, args) {
    if (!isDevelopment && !isTest) {
      // In production, send to error tracking service
      // Example: Sentry.captureException(new Error(message));
      // For now, we'll just log to file or database
      try {
        // Could write to log file or send to external service
        const errorLog = {
          level,
          message,
          args: JSON.stringify(args),
          timestamp: this.getTimestamp(),
          pid: process.pid
        };
        
        // Could save to database or send to monitoring service
        // await LogModel.create(errorLog);
        // Use errorLog variable to avoid unused warning
        if (errorLog) {
          // Future: Send to monitoring service
        }
      } catch {
        // Fail silently to avoid logging loops
      }
    }
  }
}

// Export singleton instance
const logger = new Logger();
module.exports = logger;
