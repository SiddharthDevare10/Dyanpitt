const logger = require('../utils/logger');
const tokenUtils = require('../utils/tokenUtils');
const emailService = require('./emailService');

class VerificationService {
  constructor() {
    // In-memory storage for OTP codes (in production, use Redis)
    this.otpStorage = new Map();
    this.OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes (industry standard)
    this.PASSWORD_RESET_OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes (security standard)
  }

  /**
   * Generate and store OTP for email verification
   * @param {string} email - Email address
   * @returns {string} Generated OTP
   */
  generateOTP(email) {
    const otp = tokenUtils.generateOTP(6);
    const normalizedEmail = email.toLowerCase().trim();
    
    logger.info('GenerateOTP Debug - Generated OTP:', otp, 'for email:', normalizedEmail);
    
    // Store OTP with expiry time
    this.otpStorage.set(normalizedEmail, {
      code: otp,
      expiresAt: Date.now() + this.OTP_EXPIRY_TIME,
      attempts: 0
    });

    logger.info('GenerateOTP Debug - Storage after setting:', Object.fromEntries(this.otpStorage));

    // Auto-cleanup expired OTP after expiry time
    setTimeout(() => {
      this.otpStorage.delete(normalizedEmail);
    }, this.OTP_EXPIRY_TIME);

    return otp;
  }

  /**
   * Generate and store OTP for password reset (shorter expiry)
   * @param {string} email - Email address
   * @returns {string} Generated OTP
   */
  generatePasswordResetOTP(email) {
    const otp = tokenUtils.generateOTP(6);
    const normalizedEmail = email.toLowerCase().trim();
    
    logger.info('GeneratePasswordResetOTP Debug - Generated OTP:', otp, 'for email:', normalizedEmail);
    
    // Store OTP with shorter expiry time for security
    this.otpStorage.set(normalizedEmail, {
      code: otp,
      expiresAt: Date.now() + this.PASSWORD_RESET_OTP_EXPIRY,
      attempts: 0,
      type: 'password-reset'
    });

    logger.info('GeneratePasswordResetOTP Debug - Storage after setting:', Object.fromEntries(this.otpStorage));

    // Auto-cleanup expired OTP after expiry time
    setTimeout(() => {
      this.otpStorage.delete(normalizedEmail);
    }, this.PASSWORD_RESET_OTP_EXPIRY);

    return otp;
  }

  /**
   * Verify OTP for email
   * @param {string} email - Email address
   * @param {string} otp - OTP to verify
   * @returns {object} Object with success status and specific error message
   */
  verifyOTP(email, otp) {
    const normalizedEmail = email.toLowerCase().trim();
    logger.info('VerifyOTP Debug - Looking for email:', normalizedEmail);
    logger.info('VerifyOTP Debug - Current storage:', Object.fromEntries(this.otpStorage));
    
    const storedOTP = this.otpStorage.get(normalizedEmail);
    logger.info('VerifyOTP Debug - Found stored OTP:', storedOTP);

    if (!storedOTP) {
      logger.info('VerifyOTP Debug - No OTP found for email');
      return {
        success: false,
        errorType: 'not_found',
        message: 'No verification code found. Please request a new code.'
      };
    }

    // Check if expired
    logger.info('VerifyOTP Debug - Current time:', Date.now(), 'Expires at:', storedOTP.expiresAt);
    if (Date.now() > storedOTP.expiresAt) {
      logger.info('VerifyOTP Debug - OTP expired, deleting');
      this.otpStorage.delete(normalizedEmail);
      return {
        success: false,
        errorType: 'expired',
        message: 'Verification code has expired. Please request a new code.'
      };
    }

    // Increment attempts (prevent brute force)
    logger.info('VerifyOTP Debug - Current attempts:', storedOTP.attempts);
    storedOTP.attempts++;
    if (storedOTP.attempts > 5) {
      logger.info('VerifyOTP Debug - Too many attempts, deleting');
      this.otpStorage.delete(normalizedEmail);
      return {
        success: false,
        errorType: 'too_many_attempts',
        message: 'Too many invalid attempts. Please request a new verification code.'
      };
    }

    // Verify OTP
    logger.info('VerifyOTP Debug - Comparing:', { provided: otp, stored: storedOTP.code });
    if (storedOTP.code === otp) {
      logger.info('VerifyOTP Debug - OTP match!');
      
      // For email verification (registration), delete OTP after successful verification
      // For password reset, keep it until password is actually changed
      if (storedOTP.type !== 'password-reset') {
        logger.info('VerifyOTP Debug - Email verification OTP, deleting after successful verification');
        this.otpStorage.delete(normalizedEmail);
      } else {
        logger.info('VerifyOTP Debug - Password reset OTP, keeping until password change');
      }
      
      return {
        success: true,
        message: 'Verification code verified successfully'
      };
    }

    logger.info('VerifyOTP Debug - OTP mismatch');
    return {
      success: false,
      errorType: 'invalid',
      message: 'Invalid verification code. Please check and try again.'
    };
  }

  /**
   * Legacy method for backward compatibility - returns boolean
   * @param {string} email - Email address
   * @param {string} otp - OTP to verify
   * @returns {boolean} True if valid, false otherwise
   */
  verifyOTPBoolean(email, otp) {
    const result = this.verifyOTP(email, otp);
    return result.success;
  }

  /**
   * Clear OTP for email
   * @param {string} email - Email address
   */
  clearOTP(email) {
    const normalizedEmail = email.toLowerCase().trim();
    this.otpStorage.delete(normalizedEmail);
  }

  /**
   * Check if OTP exists for email
   * @param {string} email - Email address
   * @returns {boolean} True if OTP exists and not expired
   */
  hasValidOTP(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const storedOTP = this.otpStorage.get(normalizedEmail);
    
    if (!storedOTP) {
      return false;
    }

    if (Date.now() > storedOTP.expiresAt) {
      this.otpStorage.delete(normalizedEmail);
      return false;
    }

    return true;
  }

  /**
   * Alias for hasValidOTP for backward compatibility
   * @param {string} email - Email address
   * @returns {boolean} True if OTP exists and not expired
   */
  hasOTP(email) {
    return this.hasValidOTP(email);
  }

  /**
   * Get OTP for specific email (debug/recovery purposes)
   * @param {string} email - Email address
   * @returns {string|null} OTP code if exists and valid
   */
  getOTPForEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const storedOTP = this.otpStorage.get(normalizedEmail);
    
    if (!storedOTP || Date.now() > storedOTP.expiresAt) {
      return null;
    }
    
    return storedOTP.code;
  }

  /**
   * Send OTP via email
   * @param {string} email - Email address
   * @returns {object} Result object with success status
   */
  async sendOTPEmail(email) {
    try {
      const otp = this.generateOTP(email);
      logger.info('Generated OTP for email:', email, 'OTP:', otp); // Debug log
      const result = await emailService.sendOTP(email, otp);
      
      if (!result.success) {
        this.clearOTP(email); // Clear OTP if email sending failed
      }
      
      return result;
    } catch (error) {
      this.clearOTP(email);
      logger.error('Error sending OTP email:', error);
      return {
        success: false,
        message: 'Failed to send OTP email'
      };
    }
  }

  /**
   * Send password reset OTP via email
   * @param {string} email - Email address
   * @param {string} fullName - User's full name
   * @returns {object} Result object with success status
   */
  async sendPasswordResetOTP(email, fullName) {
    try {
      const otp = this.generatePasswordResetOTP(email);
      const result = await emailService.sendPasswordResetOTP(email, otp, fullName);
      
      if (!result.success) {
        this.clearOTP(email);
      }
      
      return result;
    } catch (error) {
      this.clearOTP(email);
      logger.error('Error sending password reset OTP:', error);
      return {
        success: false,
        message: 'Failed to send password reset OTP'
      };
    }
  }

  /**
   * Generate email verification link (JWT-based)
   * @param {string} email - Email address
   * @returns {string} Verification token
   */
  generateEmailVerificationToken(email) {
    return tokenUtils.generateEmailVerificationToken(email, 'email-verification', '24h');
  }

  /**
   * Verify email verification token
   * @param {string} token - JWT token
   * @param {string} email - Expected email
   * @returns {boolean} True if valid, false otherwise
   */
  verifyEmailVerificationToken(token, email) {
    const decoded = tokenUtils.verifyEmailVerificationToken(token, 'email-verification');
    
    if (!decoded) {
      return false;
    }

    return decoded.email === email.toLowerCase().trim();
  }

  /**
   * Generate password reset token (JWT-based)
   * @param {string} email - Email address
   * @param {string} userId - User ID
   * @returns {string} Reset token
   */
  generatePasswordResetToken(email, userId) {
    return tokenUtils.generatePasswordResetToken(email, userId, '1h');
  }

  /**
   * Verify password reset token
   * @param {string} token - JWT token
   * @param {string} email - Expected email
   * @param {string} userId - Expected user ID
   * @returns {boolean} True if valid, false otherwise
   */
  verifyPasswordResetToken(token, email, userId) {
    const decoded = tokenUtils.verifyPasswordResetToken(token, email, userId);
    return !!decoded;
  }

  /**
   * Debug method to see stored OTPs
   * @returns {object} Current OTP storage
   */
  getStoredOTPs() {
    const otps = {};
    for (const [email, data] of this.otpStorage.entries()) {
      otps[email] = {
        code: data.code,
        expiresAt: new Date(data.expiresAt).toISOString(),
        attempts: data.attempts,
        isExpired: Date.now() > data.expiresAt
      };
    }
    return otps;
  }
}

module.exports = new VerificationService();