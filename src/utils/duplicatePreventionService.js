/**
 * Duplicate Prevention Service
 * Prevents users from creating multiple accounts with same email/phone
 */

import apiService from '../services/api';

class DuplicatePreventionService {
  
  /**
   * Check if email already exists
   * @param {string} email - Email to check
   * @returns {Object} - Check result
   */
  static async checkEmailExists(email) {
    try {
      const response = await apiService.request('/auth/check-email', {
        method: 'POST',
        body: { email }
      });

      return {
        success: true,
        exists: response.exists,
        message: response.exists ? 'Email already registered' : 'Email available'
      };
    } catch (error) {
      console.error('Email check error:', error);
      return {
        success: false,
        exists: false,
        error: error.message,
        message: 'Unable to verify email availability'
      };
    }
  }

  /**
   * Check if phone number already exists
   * @param {string} phoneNumber - Phone number to check
   * @returns {Object} - Check result
   */
  static async checkPhoneExists(phoneNumber) {
    try {
      const response = await apiService.request('/auth/check-phone', {
        method: 'POST',
        body: { phoneNumber }
      });

      return {
        success: true,
        exists: response.exists,
        message: response.exists ? 'Phone number already registered' : 'Phone number available'
      };
    } catch (error) {
      console.error('Phone check error:', error);
      return {
        success: false,
        exists: false,
        error: error.message,
        message: 'Unable to verify phone availability'
      };
    }
  }

  /**
   * Comprehensive duplicate check for registration
   * @param {Object} userData - User data to check
   * @returns {Object} - Comprehensive check result
   */
  static async checkForDuplicates(userData) {
    const results = {
      email: { exists: false, checked: false },
      phone: { exists: false, checked: false },
      hasConflicts: false,
      conflicts: [],
      canProceed: true
    };

    // Check email if provided
    if (userData.email) {
      const emailCheck = await this.checkEmailExists(userData.email);
      results.email = {
        exists: emailCheck.exists,
        checked: emailCheck.success,
        message: emailCheck.message,
        error: emailCheck.error
      };

      if (emailCheck.exists) {
        results.conflicts.push({
          type: 'email',
          field: 'email',
          value: userData.email,
          message: 'This email address is already registered'
        });
      }
    }

    // Check phone if provided
    if (userData.phoneNumber) {
      const phoneCheck = await this.checkPhoneExists(userData.phoneNumber);
      results.phone = {
        exists: phoneCheck.exists,
        checked: phoneCheck.success,
        message: phoneCheck.message,
        error: phoneCheck.error
      };

      if (phoneCheck.exists) {
        results.conflicts.push({
          type: 'phone',
          field: 'phoneNumber',
          value: userData.phoneNumber,
          message: 'This phone number is already registered'
        });
      }
    }

    // Set overall status
    results.hasConflicts = results.conflicts.length > 0;
    results.canProceed = !results.hasConflicts;

    return results;
  }

  /**
   * Real-time validation for form fields
   * @param {string} field - Field name (email/phoneNumber)
   * @param {string} value - Field value
   * @returns {Object} - Validation result
   */
  static async validateField(field, value) {
    if (!value || value.trim().length === 0) {
      return {
        isValid: true,
        exists: false,
        message: '',
        showStatus: false
      };
    }

    try {
      let checkResult;
      
      if (field === 'email') {
        // Basic email format validation first
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            isValid: false,
            exists: false,
            message: 'Please enter a valid email address',
            showStatus: true,
            type: 'format'
          };
        }
        
        checkResult = await this.checkEmailExists(value);
      } else if (field === 'phoneNumber') {
        // Basic phone format validation first
        const phoneRegex = /^\+91[6-9]\d{9}$/;
        if (!phoneRegex.test(value)) {
          return {
            isValid: false,
            exists: false,
            message: 'Please enter a valid phone number (+91XXXXXXXXXX)',
            showStatus: true,
            type: 'format'
          };
        }
        
        checkResult = await this.checkPhoneExists(value);
      } else {
        return {
          isValid: true,
          exists: false,
          message: 'Unknown field',
          showStatus: false
        };
      }

      if (!checkResult.success) {
        return {
          isValid: true, // Don't block on API errors
          exists: false,
          message: checkResult.message,
          showStatus: false,
          type: 'error'
        };
      }

      return {
        isValid: !checkResult.exists,
        exists: checkResult.exists,
        message: checkResult.exists ? 
          `This ${field === 'email' ? 'email' : 'phone number'} is already registered` : 
          `${field === 'email' ? 'Email' : 'Phone number'} is available`,
        showStatus: true,
        type: checkResult.exists ? 'duplicate' : 'available'
      };

    } catch (error) {
      console.error(`${field} validation error:`, error);
      return {
        isValid: true, // Don't block on errors
        exists: false,
        message: 'Unable to verify availability',
        showStatus: false,
        type: 'error'
      };
    }
  }

  /**
   * Debounced field validation for real-time checking
   * @param {string} field - Field name
   * @param {string} value - Field value
   * @param {Function} callback - Callback with validation result
   * @param {number} delay - Debounce delay in ms
   */
  static debouncedValidateField(field, value, callback, delay = 1000) {
    // Clear existing timeout
    if (this.validationTimeouts && this.validationTimeouts[field]) {
      clearTimeout(this.validationTimeouts[field]);
    }

    // Initialize timeouts object
    if (!this.validationTimeouts) {
      this.validationTimeouts = {};
    }

    // Set new timeout
    this.validationTimeouts[field] = setTimeout(async () => {
      const result = await this.validateField(field, value);
      callback(result);
    }, delay);
  }

  /**
   * Get suggested alternatives for duplicate values
   * @param {string} field - Field name
   * @param {string} value - Original value
   * @returns {Array} - Array of suggestions
   */
  static getSuggestions(field, value) {
    if (field === 'email') {
      const [username, domain] = value.split('@');
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      const suggestions = [];
      
      // Suggest different domains
      domains.forEach(d => {
        if (d !== domain) {
          suggestions.push(`${username}@${d}`);
        }
      });
      
      // Suggest with numbers
      for (let i = 1; i <= 3; i++) {
        suggestions.push(`${username}${i}@${domain}`);
      }
      
      return suggestions.slice(0, 3);
    }
    
    if (field === 'phoneNumber') {
      // For phone numbers, suggest adding/changing last digit
      const baseNumber = value.slice(0, -1);
      const suggestions = [];
      
      for (let i = 0; i <= 9; i++) {
        const newNumber = baseNumber + i;
        if (newNumber !== value) {
          suggestions.push(newNumber);
        }
      }
      
      return suggestions.slice(0, 3);
    }
    
    return [];
  }

  /**
   * Clear all validation timeouts
   */
  static clearValidationTimeouts() {
    if (this.validationTimeouts) {
      Object.values(this.validationTimeouts).forEach(timeout => {
        clearTimeout(timeout);
      });
      this.validationTimeouts = {};
    }
  }
}

export default DuplicatePreventionService;