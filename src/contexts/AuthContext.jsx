import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.js';

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

  const initializeAuth = useCallback(async () => {
    try {
      // Check if we have a token
      if (!apiService.isAuthenticated()) {
        console.log('AuthContext: No valid token found');
        setLoading(false);
        return;
      }
      console.log('AuthContext: Valid token found, fetching user data');

      // Try to get current user
      const response = await apiService.getCurrentUser();
      if (response.success && response.user) {
        console.log('AuthContext: User data fetched successfully', {
          userId: response.user._id,
          email: response.user.email,
          membershipCompleted: response.user.membershipCompleted,
          bookingCompleted: response.user.bookingCompleted
        });
        setUser(response.user);
        setIsAuthenticated(true);
        // Update localStorage with fresh user data
        localStorage.setItem('userData', JSON.stringify(response.user));
      } else {
        console.log('AuthContext: Failed to fetch user data, clearing auth');
        // Invalid token, clear auth
        clearAuth();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (loginData) => {
    try {
      console.log('🔑 AuthContext: Starting login API call...');
      const response = await apiService.login(loginData);
      
      console.log('🔑 AuthContext: API response received:', {
        success: response.success,
        hasUser: !!response.user,
        hasToken: !!response.token
      });
      
      if (response.success && response.user) {
        console.log('🔑 AuthContext: Setting user state and localStorage...');
        setUser(response.user);
        setIsAuthenticated(true);
        localStorage.setItem('userData', JSON.stringify(response.user));
        console.log('🔑 AuthContext: Login completed successfully');
        return response;
      }
      
      console.log('🔑 AuthContext: Login failed -', response.message);
      return response;
    } catch (error) {
      console.error('🔑 AuthContext: Login error:', error);
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

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    apiService.removeToken();
    localStorage.removeItem('userData');
    sessionStorage.removeItem('cameFromRegistration');
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