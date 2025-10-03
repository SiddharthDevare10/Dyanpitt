/**
 * Session Recovery Service
 * Handles token expiration and session restoration
 */

import apiService from '../services/api';

class SessionRecoveryService {
  constructor() {
    this.recoveryCallbacks = new Set();
    this.isRecovering = false;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
  }

  /**
   * Register callback for session recovery events
   * @param {Function} callback - Callback function
   */
  onSessionExpired(callback) {
    this.recoveryCallbacks.add(callback);
  }

  /**
   * Unregister callback
   * @param {Function} callback - Callback function
   */
  offSessionExpired(callback) {
    this.recoveryCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks about session expiration
   * @param {Object} context - Context information
   */
  notifySessionExpired(context = {}) {
    this.recoveryCallbacks.forEach(callback => {
      try {
        callback(context);
      } catch (error) {
        console.error('Session recovery callback error:', error);
      }
    });
  }

  /**
   * Attempt to recover session using refresh token
   * @returns {Object} - Recovery result
   */
  async attemptRecovery() {
    if (this.isRecovering) {
      return { success: false, message: 'Recovery already in progress' };
    }

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      return { success: false, message: 'Maximum recovery attempts exceeded' };
    }

    this.isRecovering = true;
    this.recoveryAttempts++;

    try {
      // Try to refresh the current user session
      const response = await apiService.getCurrentUser();
      
      if (response.success && response.user) {
        console.log('✅ Session recovered successfully');
        this.recoveryAttempts = 0; // Reset on success
        this.isRecovering = false;
        
        return {
          success: true,
          user: response.user,
          message: 'Session recovered successfully'
        };
      } else {
        throw new Error('Invalid session response');
      }
    } catch (error) {
      console.error('Session recovery failed:', error);
      this.isRecovering = false;
      
      // If this was the last attempt, clear session
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        this.clearSession();
      }
      
      return {
        success: false,
        error: error.message,
        message: 'Session recovery failed',
        attemptsRemaining: this.maxRecoveryAttempts - this.recoveryAttempts
      };
    }
  }

  /**
   * Handle API request with automatic retry on token expiration
   * @param {Function} requestFn - Function that makes the API request
   * @param {Object} options - Recovery options
   * @returns {Object} - Request result
   */
  async withRecovery(requestFn, options = {}) {
    const { maxRetries = 1, showRecoveryUI = true } = options;
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const result = await requestFn();
        
        // Reset recovery attempts on successful request
        if (result && !result.error) {
          this.recoveryAttempts = 0;
        }
        
        return result;
      } catch (error) {
        // Check if it's an authentication error
        if (this.isAuthError(error) && retries < maxRetries) {
          console.log(`🔄 Auth error detected, attempting recovery (${retries + 1}/${maxRetries + 1})`);
          
          if (showRecoveryUI) {
            this.notifySessionExpired({
              error,
              retryCount: retries + 1,
              maxRetries: maxRetries + 1
            });
          }
          
          const recoveryResult = await this.attemptRecovery();
          
          if (recoveryResult.success) {
            retries++;
            continue; // Retry the original request
          } else {
            // Recovery failed, throw the original error
            throw error;
          }
        } else {
          // Not an auth error or max retries exceeded
          throw error;
        }
      }
    }
  }

  /**
   * Check if error is related to authentication
   * @param {Error} error - Error object
   * @returns {boolean} - Whether it's an auth error
   */
  isAuthError(error) {
    const authErrorCodes = [401, 403];
    const authErrorMessages = [
      'unauthorized',
      'token expired',
      'invalid token',
      'authentication failed',
      'session expired'
    ];

    // Check status code
    if (error.status && authErrorCodes.includes(error.status)) {
      return true;
    }

    // Check error message
    const errorMessage = (error.message || '').toLowerCase();
    return authErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Save current form state before session recovery
   * @param {string} formId - Form identifier
   * @param {Object} formData - Form data to save
   */
  saveFormState(formId, formData) {
    try {
      const stateKey = `recovery_${formId}`;
      const saveData = {
        data: formData,
        timestamp: new Date().toISOString(),
        url: window.location.pathname
      };
      
      sessionStorage.setItem(stateKey, JSON.stringify(saveData));
      console.log(`💾 Saved form state for recovery: ${formId}`);
    } catch (error) {
      console.error('Failed to save form state:', error);
    }
  }

  /**
   * Restore form state after session recovery
   * @param {string} formId - Form identifier
   * @returns {Object|null} - Restored form data
   */
  restoreFormState(formId) {
    try {
      const stateKey = `recovery_${formId}`;
      const saved = sessionStorage.getItem(stateKey);
      
      if (!saved) return null;
      
      const saveData = JSON.parse(saved);
      
      // Check if data is not too old (1 hour)
      const saveTime = new Date(saveData.timestamp);
      const now = new Date();
      const hoursDiff = (now - saveTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 1) {
        sessionStorage.removeItem(stateKey);
        return null;
      }
      
      console.log(`📱 Restored form state: ${formId}`);
      return saveData;
    } catch (error) {
      console.error('Failed to restore form state:', error);
      return null;
    }
  }

  /**
   * Clear saved form state
   * @param {string} formId - Form identifier
   */
  clearFormState(formId) {
    const stateKey = `recovery_${formId}`;
    sessionStorage.removeItem(stateKey);
  }

  /**
   * Clear all session data
   */
  clearSession() {
    console.log('🧹 Clearing session data');
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Reset recovery state
    this.recoveryAttempts = 0;
    this.isRecovering = false;
    
    // Notify callbacks
    this.notifySessionExpired({ cleared: true });
  }

  /**
   * Setup automatic session monitoring
   */
  setupMonitoring() {
    // Monitor for storage events (session cleared in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'authToken' && !e.newValue) {
        console.log('🚨 Session cleared in another tab');
        this.clearSession();
      }
    });

    // Monitor for network connectivity
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored');
      // Could trigger a session check here
    });

    window.addEventListener('offline', () => {
      console.log('📡 Network connection lost');
    });
  }

  /**
   * Get recovery status
   * @returns {Object} - Current recovery status
   */
  getStatus() {
    return {
      isRecovering: this.isRecovering,
      recoveryAttempts: this.recoveryAttempts,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      canRecover: this.recoveryAttempts < this.maxRecoveryAttempts
    };
  }

  /**
   * Reset recovery attempts counter
   */
  resetRecoveryAttempts() {
    this.recoveryAttempts = 0;
  }
}

// Create singleton instance
const sessionRecoveryService = new SessionRecoveryService();

// Setup monitoring when the module loads
sessionRecoveryService.setupMonitoring();

export default sessionRecoveryService;