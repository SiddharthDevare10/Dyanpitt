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
    
    console.log('GenerateOTP Debug - Generated OTP:', otp, 'for email:', normalizedEmail);
    
    // Store OTP with expiry time
    this.otpStorage.set(normalizedEmail, {
      code: otp,
      expiresAt: Date.now() + this.OTP_EXPIRY_TIME,
      attempts: 0
    });

    console.log('GenerateOTP Debug - Storage after setting:', Object.fromEntries(this.otpStorage));

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
    console.log('VerifyOTP Debug - Looking for email:', normalizedEmail);
    console.log('VerifyOTP Debug - Current storage:', Object.fromEntries(this.otpStorage));
    
    const storedOTP = this.otpStorage.get(normalizedEmail);
    console.log('VerifyOTP Debug - Found stored OTP:', storedOTP);

    if (!storedOTP) {
      console.log('VerifyOTP Debug - No OTP found for email');
      return false;
    }

    // Check if expired
    console.log('VerifyOTP Debug - Current time:', Date.now(), 'Expires at:', storedOTP.expiresAt);
    if (Date.now() > storedOTP.expiresAt) {
      console.log('VerifyOTP Debug - OTP expired, deleting');
      this.otpStorage.delete(normalizedEmail);
      return false;
    }

    // Increment attempts (prevent brute force)
    console.log('VerifyOTP Debug - Current attempts:', storedOTP.attempts);
    storedOTP.attempts++;
    if (storedOTP.attempts > 5) {
      console.log('VerifyOTP Debug - Too many attempts, deleting');
      this.otpStorage.delete(normalizedEmail);
      return false;
    }

    // Verify OTP
    console.log('VerifyOTP Debug - Comparing:', { provided: otp, stored: storedOTP.code });
    if (storedOTP.code === otp) {
      console.log('VerifyOTP Debug - OTP match! NOT deleting yet - will delete after password reset');
      // Don't delete here - let the reset-password route delete it after successful password change
      return true;
    }

    console.log('VerifyOTP Debug - OTP mismatch');
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
      console.log('Generated OTP for email:', email, 'OTP:', otp); // Debug log
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