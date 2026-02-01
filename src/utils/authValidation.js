/**
 * Authentication validation utility
 * Ensures all state-changing operations require proper authentication
 */

import apiService from '../services/api.js';
import logger from './logger';

/**
 * Validate that user is properly authenticated for state-changing operations
 * @param {Object} user - Current user object from context
 * @returns {Object} - Validation result with isValid and reason
 */
export const validateAuthentication = (user) => {
  // Check if user object exists
  if (!user) {
    return {
      isValid: false,
      reason: 'No user object available',
      action: 'redirect_to_login'
    };
  }

  // Check if we have a valid token
  if (!apiService.isAuthenticated()) {
    return {
      isValid: false,
      reason: 'No valid authentication token',
      action: 'redirect_to_login'
    };
  }

  // All checks passed
  return {
    isValid: true,
    reason: 'User is properly authenticated',
    action: 'proceed'
  };
};

/**
 * Handle authentication failure scenarios
 * @param {Function} logout - Logout function from auth context
 * @param {Function} navigate - Navigate function from router
 * @param {string} reason - Reason for authentication failure
 */
export const handleAuthenticationFailure = (logout, navigate, reason) => {
  logger.warn(`Authentication failure: ${reason}`);
  
  // Clear any invalid authentication state
  logout();
  
  // Redirect to login with appropriate message
  navigate('/login', { 
    state: { 
      message: 'Please log in again to continue.',
      returnUrl: window.location.pathname
    },
    replace: true 
  });
};

/**
 * Wrapper for state-changing operations that require authentication
 * @param {Function} operation - The async operation to perform
 * @param {Object} authContext - Auth context with user, logout functions
 * @param {Function} navigate - Navigate function from router
 * @returns {Promise} - Result of the operation or handles auth failure
 */
export const withAuthenticationRequired = async (operation, authContext, navigate) => {
  const { user, logout } = authContext;
  
  // Validate authentication before proceeding
  const authValidation = validateAuthentication(user);
  
  if (!authValidation.isValid) {
    handleAuthenticationFailure(logout, navigate, authValidation.reason);
    return {
      success: false,
      message: 'Authentication required',
      requiresLogin: true
    };
  }

  try {
    // Execute the operation
    return await operation();
  } catch (error) {
    // Check if error is due to authentication issues
    if (error.message.includes('401') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('Invalid token')) {
      
      handleAuthenticationFailure(logout, navigate, 'Server rejected authentication token');
      return {
        success: false,
        message: 'Session expired. Please log in again.',
        requiresLogin: true
      };
    }
    
    // Re-throw non-authentication errors
    throw error;
  }
};

/**
 * Refresh user data from server and update context
 * @param {Object} authContext - Auth context with refreshUser function
 * @returns {Promise<Object>} - Updated user data or null if failed
 */
export const ensureFreshUserData = async (authContext) => {
  const { refreshUser, logout } = authContext;
  
  try {
    const freshUser = await refreshUser();
    if (!freshUser) {
      logger.warn('Failed to refresh user data - user may be logged out');
      return null;
    }
    return freshUser;
  } catch (error) {
    logger.error('Error refreshing user data:', error);
    
    // If refresh fails due to auth issues, handle appropriately
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      logout();
      return null;
    }
    
    // For other errors, return null but don't logout
    return null;
  }
};

/**
 * Validate and prepare form data for server submission
 * This ensures no client-only state changes occur
 * @param {Object} formData - Form data to validate
 * @param {Object} user - Current user state
 * @param {Array} requiredFields - List of required field names
 * @returns {Object} - Validation result with prepared data
 */
export const validateFormDataForSubmission = (formData, user, requiredFields = []) => {
  // Check authentication first
  const authValidation = validateAuthentication(user);
  if (!authValidation.isValid) {
    return {
      isValid: false,
      reason: authValidation.reason,
      requiresAuth: true
    };
  }

  // Validate required fields
  const missingFields = requiredFields.filter(field => {
    const value = formData[field];
    return value === null || value === undefined || value === '';
  });

  if (missingFields.length > 0) {
    return {
      isValid: false,
      reason: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields
    };
  }

  // Validation passed
  return {
    isValid: true,
    reason: 'Form data is valid for submission',
    data: { ...formData }
  };
};

/**
 * Standard error handler for form submissions
 * @param {Error} error - The error that occurred
 * @param {Function} setErrors - Function to set form errors
 * @param {Object} authContext - Auth context for handling auth errors
 * @param {Function} navigate - Navigate function for redirects
 */
export const handleFormSubmissionError = (error, setErrors, authContext, navigate) => {
  logger.error('Form submission error:', error);
  
  // Handle authentication errors
  if (error.message.includes('401') || 
      error.message.includes('Unauthorized') ||
      error.message.includes('Invalid token')) {
    
    handleAuthenticationFailure(
      authContext.logout, 
      navigate, 
      'Authentication failed during form submission'
    );
    return;
  }

  // Handle network errors
  if (error.message.includes('Network error') || 
      error.message.includes('Failed to fetch')) {
    setErrors({ 
      submit: 'Network error. Please check your connection and try again.' 
    });
    return;
  }

  // Handle server validation errors
  if (error.message.includes('Validation failed')) {
    setErrors({ 
      submit: error.message 
    });
    return;
  }

  // Generic error handling
  setErrors({ 
    submit: error.message || 'An unexpected error occurred. Please try again.' 
  });
};