/**
 * Enhanced input validation and sanitization
 * Provides comprehensive validation for user inputs
 */

import logger from './logger';

/**
 * Sanitize string input - remove dangerous characters
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\w\s@.\-,()]/gi, ''); // Allow only safe characters
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }
  
  return { valid: true, sanitized: trimmedEmail };
};

/**
 * Validate phone number (Indian format)
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Check for Indian mobile number format
  const phoneRegex = /^[6-9]\d{9}$/;
  
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid phone number. Must be 10 digits starting with 6-9' };
  }
  
  return { valid: true, sanitized: `+91${cleaned}` };
};

/**
 * Validate name (allows alphabets, spaces, hyphens)
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: `${fieldName} is too long` };
  }
  
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { valid: true, sanitized: trimmed };
};

/**
 * Validate age (18-100)
 */
export const validateAge = (age) => {
  const numAge = parseInt(age, 10);
  
  if (isNaN(numAge)) {
    return { valid: false, error: 'Age must be a number' };
  }
  
  if (numAge < 18) {
    return { valid: false, error: 'You must be at least 18 years old' };
  }
  
  if (numAge > 100) {
    return { valid: false, error: 'Please enter a valid age' };
  }
  
  return { valid: true, sanitized: numAge };
};

/**
 * Validate date (not in future, not too old)
 */
export const validateDate = (date, fieldName = 'Date') => {
  if (!date) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  const today = new Date();
  const maxAge = 120; // Maximum age in years
  const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
  
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: `Invalid ${fieldName.toLowerCase()}` };
  }
  
  if (dateObj > today) {
    return { valid: false, error: `${fieldName} cannot be in the future` };
  }
  
  if (dateObj < minDate) {
    return { valid: false, error: `${fieldName} is too old` };
  }
  
  return { valid: true, sanitized: dateObj.toISOString().split('T')[0] };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required', strength: 0 };
  }
  
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  // Calculate strength
  if (checks.length) strength += 20;
  if (checks.uppercase) strength += 20;
  if (checks.lowercase) strength += 20;
  if (checks.number) strength += 20;
  if (checks.special) strength += 20;
  
  const errors = [];
  if (!checks.length) errors.push('at least 8 characters');
  if (!checks.uppercase) errors.push('one uppercase letter');
  if (!checks.lowercase) errors.push('one lowercase letter');
  if (!checks.number) errors.push('one number');
  
  if (strength < 60) {
    return {
      valid: false,
      error: `Password must contain ${errors.join(', ')}`,
      strength
    };
  }
  
  return { valid: true, strength };
};

/**
 * Validate and sanitize form data
 */
export const validateFormData = (data, schema) => {
  const errors = {};
  const sanitized = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${rules.label || field} is required`;
      continue;
    }
    
    // Skip validation if not required and empty
    if (!rules.required && (!value || value.toString().trim() === '')) {
      continue;
    }
    
    // Apply validation based on type
    let result;
    switch (rules.type) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      case 'name':
        result = validateName(value, rules.label);
        break;
      case 'age':
        result = validateAge(value);
        break;
      case 'date':
        result = validateDate(value, rules.label);
        break;
      case 'password':
        result = validatePassword(value);
        break;
      default:
        result = { valid: true, sanitized: sanitizeString(value) };
    }
    
    if (!result.valid) {
      errors[field] = result.error;
    } else if (result.sanitized !== undefined) {
      sanitized[field] = result.sanitized;
    } else {
      sanitized[field] = value;
    }
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  if (!isValid) {
    logger.warn('Form validation failed:', errors);
  }
  
  return { isValid, errors, sanitized };
};

export default {
  sanitizeString,
  validateEmail,
  validatePhone,
  validateName,
  validateAge,
  validateDate,
  validatePassword,
  validateFormData
};
