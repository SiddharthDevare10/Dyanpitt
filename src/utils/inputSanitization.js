/**
 * Input sanitization and validation utilities
 */

// XSS protection - escape HTML characters
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Remove potentially dangerous characters
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Phone number sanitization
export const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +91 for Indian numbers
  if (cleaned.startsWith('91') && !cleaned.startsWith('+91')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+91') && cleaned.length === 10) {
    cleaned = '+91' + cleaned;
  }
  
  return cleaned;
};

// Email sanitization
export const sanitizeEmail = (email) => {
  if (!email) return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, ''); // Only allow word chars, @, ., and -
};

// Name sanitization (remove numbers and special chars except spaces, hyphens, apostrophes)
export const sanitizeName = (name) => {
  if (!name) return '';
  
  return name
    .replace(/[^a-zA-Z\s'-]/g, '') // Only letters, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();
};

// Address sanitization
export const sanitizeAddress = (address) => {
  if (!address) return '';
  
  return address
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim()
    .substring(0, 500); // Limit length
};

// General text sanitization
export const sanitizeText = (text, maxLength = 1000) => {
  if (!text) return '';
  
  return sanitizeInput(text)
    .substring(0, maxLength)
    .trim();
};

// Validation functions
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

export const isValidPassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidName = (name) => {
  const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
  return nameRegex.test(name);
};

// Form data sanitizer
export const sanitizeFormData = (formData) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      switch (key) {
        case 'email':
          sanitized[key] = sanitizeEmail(value);
          break;
        case 'phoneNumber':
        case 'parentContactNumber':
          sanitized[key] = sanitizePhoneNumber(value);
          break;
        case 'fullName':
        case 'fatherName':
          sanitized[key] = sanitizeName(value);
          break;
        case 'currentAddress':
          sanitized[key] = sanitizeAddress(value);
          break;
        case 'password':
          // Don't sanitize passwords, just validate
          sanitized[key] = value;
          break;
        default:
          sanitized[key] = sanitizeText(value);
          break;
      }
    } else {
      // Keep non-string values as-is (files, dates, etc.)
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export default {
  escapeHtml,
  sanitizeInput,
  sanitizePhoneNumber,
  sanitizeEmail,
  sanitizeName,
  sanitizeAddress,
  sanitizeText,
  sanitizeFormData,
  isValidEmail,
  isValidPhoneNumber,
  isValidPassword,
  isValidName
};