const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TokenUtils {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    this.EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || 'email-verification-secret';
  }

  /**
   * Generate a JWT token for email verification
   * @param {string} email - Email to verify
   * @param {string} purpose - Purpose of the token (e.g., 'email-verification', 'password-reset')
   * @param {string} expiresIn - Token expiration time (default: '24h')
   * @returns {string} JWT token
   */
  generateEmailVerificationToken(email, purpose = 'email-verification', expiresIn = '24h') {
    const payload = {
      email: email.toLowerCase().trim(),
      purpose,
      timestamp: Date.now()
    };

    return jwt.sign(payload, this.EMAIL_VERIFICATION_SECRET, { expiresIn });
  }

  /**
   * Verify and decode an email verification token
   * @param {string} token - JWT token to verify
   * @param {string} expectedPurpose - Expected purpose of the token
   * @returns {object|null} Decoded payload or null if invalid
   */
  verifyEmailVerificationToken(token, expectedPurpose = 'email-verification') {
    try {
      const decoded = jwt.verify(token, this.EMAIL_VERIFICATION_SECRET);
      
      // Check if the purpose matches
      if (decoded.purpose !== expectedPurpose) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.error('Token verification error:', error.message);
      return null;
    }
  }

  /**
   * Generate a secure OTP code
   * @param {number} length - Length of OTP (default: 6)
   * @returns {string} OTP code
   */
  generateOTP(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate a password reset token (JWT-based)
   * @param {string} email - User email
   * @param {string} userId - User ID for additional security
   * @param {string} expiresIn - Token expiration time (default: '1h')
   * @returns {string} JWT token
   */
  generatePasswordResetToken(email, userId, expiresIn = '1h') {
    const payload = {
      email: email.toLowerCase().trim(),
      userId,
      purpose: 'password-reset',
      timestamp: Date.now()
    };

    return jwt.sign(payload, this.EMAIL_VERIFICATION_SECRET, { expiresIn });
  }

  /**
   * Verify password reset token
   * @param {string} token - JWT token to verify
   * @param {string} expectedEmail - Expected email
   * @param {string} expectedUserId - Expected user ID
   * @returns {object|null} Decoded payload or null if invalid
   */
  verifyPasswordResetToken(token, expectedEmail, expectedUserId) {
    try {
      const decoded = jwt.verify(token, this.EMAIL_VERIFICATION_SECRET);
      
      // Verify purpose, email, and user ID
      if (decoded.purpose !== 'password-reset' || 
          decoded.email !== expectedEmail.toLowerCase().trim() ||
          decoded.userId !== expectedUserId) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.error('Password reset token verification error:', error.message);
      return null;
    }
  }

  /**
   * Generate a secure random string for temporary identifiers
   * @param {number} length - Length of the string (default: 32)
   * @returns {string} Random string
   */
  generateSecureRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = new TokenUtils();