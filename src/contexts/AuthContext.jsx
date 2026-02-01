import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.js';
import SessionManager from '../utils/sessionManager.js';
import logger from '../utils/logger';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Global flag to prevent multiple initializations across all instances
let authInitializationPromise = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const clearAuth = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    
    // Use session manager for comprehensive cleanup
    SessionManager.clearSession();
    
    // Also clean up any remaining localStorage items
    localStorage.removeItem('userData');
    localStorage.removeItem('congratulationsShownAt');
    sessionStorage.removeItem('cameFromRegistration');
  }, []);


  // Initialize auth state and setup session cleanup
  useEffect(() => {
    // If already initializing, don't start another one
    if (authInitializationPromise) return;
    
    authInitializationPromise = (async () => {
      try {
        // Add a small delay to prevent rapid successive calls during navigation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Check if we have a token
        if (!apiService.isAuthenticated()) {
          
          // CRITICAL FIX: Don't clear auth if user has recently interacted with cash payment system
          const recentCashActivity = localStorage.getItem('congratulationsShownAt');
          const isRecentCashUser = recentCashActivity && 
            (Date.now() - parseInt(recentCashActivity)) < 2 * 60 * 1000; // 2 minutes
          
          if (isRecentCashUser) {
            // Use React Router navigation instead of window.location.href
            // This will be handled by ProtectedRoute component
            return { user: null, isAuthenticated: false };
          }
          
          // Just set initial state - no session clearing needed on first load
          return { user: null, isAuthenticated: false };
        }

        // Try to get current user
        const response = await apiService.getCurrentUser();
        
        if (response.success && response.user) {
          return { user: response.user, isAuthenticated: true };
        } else {
          // Don't immediately clear token - it might be a temporary race condition
          // Let the dashboard handle 401 errors gracefully instead
          return { user: null, isAuthenticated: false };
        }
      } catch (error) {
        logger.error('🚨 AuthContext: Auth initialization error:', error);
        // Don't clear token on initialization errors - could be race condition
        // Let individual API calls handle token clearing if really needed
        return { user: null, isAuthenticated: false };
      }
    })();

    authInitializationPromise.then((result) => {
      setUser(result.user);
      setIsAuthenticated(result.isAuthenticated);
      setLoading(false);
      // Reset the promise after completion to allow future re-initialization if needed
      authInitializationPromise = null;
    });

    // Cleanup function
    return () => {
      // Don't reset the promise here - let it complete for all instances
    };
  }, []); // Empty dependency array - only run once

  const login = async (loginData) => {
    try {
      const response = await apiService.login(loginData);
      
      if (response.success && response.user && response.token) {
        // Create session-based authentication (clears when browser/tab closes)
        SessionManager.createSession(response.token, response.user);
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        // User data stored only in memory - always fetched fresh from API
        
        return response;
      }
      
      return response;
    } catch (error) {
      logger.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };


  const updateUser = (userData) => {
    setUser(userData);
    // No localStorage storage - data always comes from API
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
        // User data stored only in memory - always fresh from API
        return response.user;
      }
    } catch (error) {
      logger.error('Error refreshing user:', error);
      clearAuth();
    }
    return null;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
    clearAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};