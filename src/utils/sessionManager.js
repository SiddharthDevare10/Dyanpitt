// Session Management Utilities
import apiService from '../services/api.js';
import logger from './logger';

/**
 * Enhanced session management for better UX
 */
export class SessionManager {
  static SESSION_KEY = 'dyanpitt_session';
  static ACTIVITY_KEY = 'last_activity';
  static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Initialize session with proper cleanup
   */
  static initializeSession() {
    // Only setup cleanup listeners, don't update activity or check timeout yet
    // Activity will be updated when session is created
    this.setupCleanupListeners();
    
    // Don't check session timeout on initialization - only after session is created
    // this.checkSessionTimeout();
  }

  /**
   * Setup event listeners for session cleanup
   */
  static setupCleanupListeners() {
    // DON'T clear session on page reload - only on actual browser/tab close
    // The beforeunload event fires on both reload and close, so we need to be more careful
    
    // Update activity on user interaction
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity();
      }, { passive: true });
    });

    // Check for session timeout periodically
    setInterval(() => {
      this.checkSessionTimeout();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Update last activity timestamp
   */
  static updateActivity() {
    sessionStorage.setItem(this.ACTIVITY_KEY, Date.now().toString());
  }

  /**
   * Check if session has timed out
   */
  static checkSessionTimeout() {
    const lastActivity = sessionStorage.getItem(this.ACTIVITY_KEY);
    const authToken = sessionStorage.getItem('authToken');
    
    // Only check timeout if we have both activity timestamp AND an auth token
    // This prevents clearing sessions during initial load
    if (lastActivity && authToken) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      
      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        logger.info('🚨 SessionManager: Session timed out due to inactivity');
        this.handleSessionTimeout();
      }
    }
    // Don't do anything if no session exists or no token - this is normal on first load
  }

  /**
   * Handle session timeout
   */
  static handleSessionTimeout() {
    logger.info('🚨 SessionManager: Session timeout triggered!');
    console.trace('Session timeout call stack');
    
    // Clear session and redirect to login
    this.clearSession();
    
    // Show timeout message
    alert('Your session has expired due to inactivity. Please log in again.');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  /**
   * Clear session data
   */
  static clearSession() {
    logger.info('🚨 SessionManager: clearSession called');
    console.trace('clearSession call stack');
    
    // Log what's in sessionStorage before clearing
    logger.info('🔍 SessionManager: sessionStorage contents before clear:', {
      authToken: !!sessionStorage.getItem('authToken'),
      sessionKey: !!sessionStorage.getItem(this.SESSION_KEY),
      activityKey: !!sessionStorage.getItem(this.ACTIVITY_KEY),
      allKeys: Object.keys(sessionStorage)
    });
    
    // Clear all session storage
    sessionStorage.clear();
    
    // Also clear auth token from API service
    apiService.removeToken();
    
    // Clear any localStorage auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }

  /**
   * Check if session is valid
   */
  static isSessionValid() {
    // Check if we have a token
    if (!apiService.isAuthenticated()) {
      return false;
    }

    // Check if session hasn't timed out
    const lastActivity = sessionStorage.getItem(this.ACTIVITY_KEY);
    if (!lastActivity) {
      return false;
    }

    const timeSinceActivity = Date.now() - parseInt(lastActivity);
    return timeSinceActivity <= this.SESSION_TIMEOUT;
  }

  /**
   * Create a new session
   */
  static createSession(token, user) {
    // Set token in session storage
    apiService.setToken(token);
    
    // Mark session as active
    this.updateActivity();
    
    // Store session info
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
      created: Date.now(),
      userId: user.id,
      email: user.email
    }));

    logger.info('New session created - will expire when browser/tab closes');
  }

  /**
   * Get session info
   */
  static getSessionInfo() {
    const sessionData = sessionStorage.getItem(this.SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  }
}

// Auto-initialize session management - but only once
if (typeof window !== 'undefined' && !window.__sessionManagerInitialized) {
  // Initialize when the module loads, but only once
  SessionManager.initializeSession();
  window.__sessionManagerInitialized = true;
}

export default SessionManager;