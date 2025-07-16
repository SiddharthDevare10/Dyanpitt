const tokenUtils = require('../utils/tokenUtils');
const emailService = require('./emailService');

class VerificationService {
  constructor() {
    // In-memory storage for OTP codes (in production, use Redis)
    this.otpStorage = new Map();
    this.OTP_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Generate and store OTP for email verification
   * @param {string} email - Email address
   * @returns {string} Generated OTP
   */
  generateOTP(email) {
    const otp = tokenUtils.generateOTP(6);
    const normalizedEmail = email.toLowerCase().trim();
    
    // Store OTP with expiry time
    this.otpStorage.set(normalizedEmail, {
      code: otp,
      expiresAt: Date.now() + this.OTP_EXPIRY_TIME,
      attempts: 0
    });

    // Auto-cleanup expired OTP after expiry time
    setTimeout(() => {
      this.otpStorage.delete(normalizedEmail);
    }, this.OTP_EXPIRY_TIME);

    return otp;
  }

  /**
   * Verify OTP for email
   * @param {string} email - Email address
   * @param {string} otp - OTP to verify
   * @returns {boolean} True if valid, false otherwise
   */
  verifyOTP(email, otp) {
    const normalizedEmail = email.toLowerCase().trim();
    const storedOTP = this.otpStorage.get(normalizedEmail);

    if (!storedOTP) {
      return false;
    }

    // Check if expired
    if (Date.now() > storedOTP.expiresAt) {
      this.otpStorage.delete(normalizedEmail);
      return false;
    }

    // Increment attempts (prevent brute force)
    storedOTP.attempts++;
    if (storedOTP.attempts > 5) {
      this.otpStorage.delete(normalizedEmail);
      return false;
    }

    // Verify OTP
    if (storedOTP.code === otp) {
      this.otpStorage.delete(normalizedEmail); // Clear after successful verification
      return true;
    }

    return false;
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
   * Send OTP via email
   * @param {string} email - Email address
   * @returns {object} Result object with success status
   */
  async sendOTPEmail(email) {
    try {
      const otp = this.generateOTP(email);
      const result = await emailService.sendOTP(email, otp);
      
      if (!result.success) {
        this.clearOTP(email); // Clear OTP if email sending failed
      }
      
      return result;
    } catch (error) {
      this.clearOTP(email);
      console.error('Error sending OTP email:', error);
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
      const otp = this.generateOTP(email);
      const result = await emailService.sendPasswordResetOTP(email, otp, fullName);
      
      if (!result.success) {
        this.clearOTP(email);
      }
      
      return result;
    } catch (error) {
      this.clearOTP(email);
      console.error('Error sending password reset OTP:', error);
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
}

module.exports = new VerificationService();