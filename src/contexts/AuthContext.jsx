import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.js';
import SessionManager from '../utils/sessionManager.js';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
    sessionStorage.removeItem('cameFromRegistration');
  }, []);

  const initializeAuth = useCallback(async () => {
    let isCancelled = false; // Prevent race conditions
    
    try {
      // Check if we have a token
      if (!apiService.isAuthenticated()) {
        if (!isCancelled) {
          clearAuth(); // Ensure clean state
          setLoading(false);
        }
        return;
      }

      // Try to get current user
      const response = await apiService.getCurrentUser();
      
      // Only update state if this call hasn't been cancelled
      if (!isCancelled) {
        if (response.success && response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
          // Update localStorage with fresh user data
          localStorage.setItem('userData', JSON.stringify(response.user));
        } else {
          // Invalid token, clear auth
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear auth on any error (network, 401, etc.) only if not cancelled
      if (!isCancelled) {
        clearAuth();
      }
    } finally {
      if (!isCancelled) {
        setLoading(false);
      }
    }
    
    // Return cleanup function to cancel if component unmounts
    return () => {
      isCancelled = true;
    };
  }, [clearAuth]);

  // Initialize auth state and setup session cleanup
  useEffect(() => {
    initializeAuth();

    // DON'T clear session storage on page reload
    // The beforeunload event fires on both reload and close
    // We want to preserve session data during page reloads for better UX
    
    // Note: Session cleanup is now handled by SessionManager if needed
  }, [initializeAuth]);

  const login = async (loginData) => {
    try {
      const response = await apiService.login(loginData);
      
      if (response.success && response.user && response.token) {
        // Create session-based authentication (clears when browser/tab closes)
        SessionManager.createSession(response.token, response.user);
        
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Store minimal user data in localStorage for persistence
        localStorage.setItem('userData', JSON.stringify(response.user));
        
        console.log('✅ Session-based login successful - will expire when tab closes');
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };


  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('userData', JSON.stringify(response.user));
        return response.user;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
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