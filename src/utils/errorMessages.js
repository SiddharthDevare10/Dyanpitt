/**
 * Centralized error message constants and utilities
 */

export const ERROR_MESSAGES = {
  // Authentication Errors
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in.',
    ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    UNAUTHORIZED: 'You are not authorized to access this resource.',
    ADMIN_REQUIRED: 'Administrator privileges required.',
  },

  // Registration Errors
  REGISTRATION: {
    EMAIL_EXISTS: 'An account with this email already exists.',
    PHONE_EXISTS: 'This phone number is already registered.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PHONE: 'Please enter a valid phone number (+91XXXXXXXXXX).',
    WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    REQUIRED_FIELD: 'This field is required.',
    INVALID_DATE: 'Please enter a valid date.',
  },

  // Network Errors
  NETWORK: {
    CONNECTION_ERROR: 'Unable to connect to server. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
    NOT_FOUND: 'The requested resource was not found.',
  },

  // File Upload Errors (from fileValidation.js)
  FILE: {
    NO_FILE: 'Please select a file',
    INVALID_TYPE: 'Please select a valid image file (JPG, PNG, WEBP)',
    FILE_TOO_LARGE: 'File size must be less than 5MB',
    UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  },

  // Form Validation Errors
  VALIDATION: {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_DATE: 'Please enter a valid date',
    DATE_IN_PAST: 'Date cannot be in the past',
    DATE_TOO_FAR: 'Date cannot be more than 7 days in the future',
    MIN_LENGTH: (min) => `Must be at least ${min} characters`,
    MAX_LENGTH: (max) => `Must be no more than ${max} characters`,
  },

  // Payment Errors
  PAYMENT: {
    PAYMENT_FAILED: 'Payment processing failed. Please try again.',
    INVALID_AMOUNT: 'Invalid payment amount.',
    PAYMENT_CANCELLED: 'Payment was cancelled.',
    CASH_PENDING: 'Your cash payment is pending collection by admin.',
  },

  // General Errors
  GENERAL: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    MAINTENANCE: 'System is under maintenance. Please try again later.',
    FEATURE_DISABLED: 'This feature is currently disabled.',
  }
};

/**
 * Format API error response into user-friendly message
 * @param {Error|Object} error - Error object or API response
 * @returns {string} - User-friendly error message
 */
export const formatErrorMessage = (error) => {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's an Error object
  if (error instanceof Error) {
    // Check for network-specific errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return ERROR_MESSAGES.NETWORK.CONNECTION_ERROR;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.NETWORK.TIMEOUT;
    }
    return error.message || ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
  }

  // If it's an API response object
  if (error && typeof error === 'object') {
    if (error.message) {
      return error.message;
    }
    if (error.error) {
      return error.error;
    }
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map(err => err.msg || err.message).join(', ');
    }
  }

  return ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
};

/**
 * Get validation error message for a field
 * @param {string} field - Field name
 * @param {string} rule - Validation rule
 * @param {*} value - Field value or validation parameter
 * @returns {string} - Error message
 */
export const getValidationError = (field, rule, value) => {
  const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
  
  switch (rule) {
    case 'required':
      return `${fieldName} is required`;
    case 'email':
      return ERROR_MESSAGES.VALIDATION.INVALID_EMAIL;
    case 'phone':
      return ERROR_MESSAGES.VALIDATION.INVALID_PHONE;
    case 'minLength':
      return `${fieldName} ${ERROR_MESSAGES.VALIDATION.MIN_LENGTH(value)}`;
    case 'maxLength':
      return `${fieldName} ${ERROR_MESSAGES.VALIDATION.MAX_LENGTH(value)}`;
    case 'pastDate':
      return `${fieldName} ${ERROR_MESSAGES.VALIDATION.DATE_IN_PAST}`;
    case 'futureDate':
      return `${fieldName} ${ERROR_MESSAGES.VALIDATION.DATE_TOO_FAR}`;
    default:
      return ERROR_MESSAGES.VALIDATION.REQUIRED;
  }
};

export default {
  ERROR_MESSAGES,
  formatErrorMessage,
  getValidationError
};