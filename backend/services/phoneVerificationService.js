const logger = require('../utils/logger');
/**
 * Phone Verification Service using OTP
 * Similar to email verification but for phone numbers
 */
class PhoneVerificationService {
  constructor() {
    this.otps = new Map(); // Store OTPs temporarily
    this.attempts = new Map(); // Track verification attempts
  }

  /**
   * Generate and send OTP to phone number
   * @param {string} phoneNumber - Phone number in +91 format
   * @returns {Object} - Result of OTP sending
   */
  async sendOTP(phoneNumber) {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Check rate limiting (max 3 attempts per 30 minutes)
      if (this.isRateLimited(normalizedPhone)) {
        return {
          success: false,
          message: 'Too many OTP requests. Please wait before requesting again.',
          code: 'RATE_LIMITED'
        };
      }

      // Generate 6-digit OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      this.otps.set(normalizedPhone, {
        otp,
        expiresAt,
        createdAt: new Date(),
        attempts: 0
      });

      // Track attempt
      this.trackAttempt(normalizedPhone);

      // Send SMS (mock implementation - replace with actual SMS service)
      const smsResult = await this.sendSMS(normalizedPhone, otp);
      
      if (!smsResult.success) {
        this.otps.delete(normalizedPhone);
        return {
          success: false,
          message: 'Failed to send OTP SMS',
          error: smsResult.error
        };
      }

      logger.info(`📱 OTP sent to ${normalizedPhone}: ${otp} (Development only)`);

      return {
        success: true,
        message: 'OTP sent successfully to your phone number',
        expiresIn: 600 // 10 minutes in seconds
      };

    } catch (error) {
      logger.error('Phone OTP sending error:', error);
      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.message
      };
    }
  }

  /**
   * Verify OTP for phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP to verify
   * @returns {boolean} - Verification result
   */
  verifyOTP(phoneNumber, otp) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const storedData = this.otps.get(normalizedPhone);

      if (!storedData) {
        logger.info(`❌ No OTP found for phone: ${normalizedPhone}`);
        return false;
      }

      // Check if OTP has expired
      if (new Date() > storedData.expiresAt) {
        logger.info(`❌ OTP expired for phone: ${normalizedPhone}`);
        this.otps.delete(normalizedPhone);
        return false;
      }

      // Check attempt limit (max 5 attempts per OTP)
      if (storedData.attempts >= 5) {
        logger.info(`❌ Too many attempts for phone: ${normalizedPhone}`);
        this.otps.delete(normalizedPhone);
        return false;
      }

      // Increment attempt count
      storedData.attempts++;

      // Verify OTP
      if (storedData.otp !== otp.toString()) {
        logger.info(`❌ Invalid OTP for phone: ${normalizedPhone}`);
        return false;
      }

      // Success - remove OTP
      this.otps.delete(normalizedPhone);
      logger.info(`✅ OTP verified successfully for phone: ${normalizedPhone}`);
      return true;

    } catch (error) {
      logger.error('Phone OTP verification error:', error);
      return false;
    }
  }

  /**
   * Check if phone number has valid OTP
   * @param {string} phoneNumber - Phone number to check
   * @returns {boolean} - Whether valid OTP exists
   */
  hasValidOTP(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const storedData = this.otps.get(normalizedPhone);
    
    if (!storedData) return false;
    
    return new Date() <= storedData.expiresAt;
  }

  /**
   * Clear OTP for phone number
   * @param {string} phoneNumber - Phone number
   */
  clearOTP(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    this.otps.delete(normalizedPhone);
    logger.info(`🧹 Cleared OTP for phone: ${normalizedPhone}`);
  }

  /**
   * Generate 6-digit OTP
   * @returns {string} - Generated OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Normalize phone number to standard format
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} - Normalized phone number
   */
  normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +91
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('9') && cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Check if phone number is rate limited
   * @param {string} phoneNumber - Phone number to check
   * @returns {boolean} - Whether rate limited
   */
  isRateLimited(phoneNumber) {
    const attempts = this.attempts.get(phoneNumber) || [];
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Filter attempts from last 30 minutes
    const recentAttempts = attempts.filter(attempt => attempt > thirtyMinutesAgo);
    
    return recentAttempts.length >= 3;
  }

  /**
   * Track OTP attempt for rate limiting
   * @param {string} phoneNumber - Phone number
   */
  trackAttempt(phoneNumber) {
    const attempts = this.attempts.get(phoneNumber) || [];
    attempts.push(new Date());
    
    // Keep only last 10 attempts
    if (attempts.length > 10) {
      attempts.splice(0, attempts.length - 10);
    }
    
    this.attempts.set(phoneNumber, attempts);
  }

  /**
   * Send SMS (mock implementation)
   * Replace with actual SMS service like Twilio, AWS SNS, etc.
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP to send
   * @returns {Object} - SMS sending result
   */
  async sendSMS(phoneNumber, otp) {
    try {
      // Mock SMS sending - replace with actual service
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📱 MOCK SMS to ${phoneNumber}: Your Dyanpitt verification code is: ${otp}. Valid for 10 minutes.`);
        
        return {
          success: true,
          messageId: 'mock_' + Date.now()
        };
      }

      // In production, implement actual SMS service
      // Example with Twilio:
      /*
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      
      const message = await client.messages.create({
        body: `Your Dyanpitt verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      return {
        success: true,
        messageId: message.sid
      };
      */

      // For now, just log in production
      logger.info(`📱 SMS would be sent to ${phoneNumber}: ${otp}`);
      return {
        success: true,
        messageId: 'production_mock_' + Date.now()
      };

    } catch (error) {
      logger.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup expired OTPs (run periodically)
   */
  cleanupExpiredOTPs() {
    const now = new Date();
    let cleaned = 0;

    for (const [phoneNumber, data] of this.otps.entries()) {
      if (now > data.expiresAt) {
        this.otps.delete(phoneNumber);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} expired phone OTPs`);
    }

    return cleaned;
  }

  /**
   * Get stored OTPs for debugging (development only)
   * @returns {Array} - Stored OTPs
   */
  getStoredOTPs() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    const otps = [];
    for (const [phoneNumber, data] of this.otps.entries()) {
      otps.push({
        phoneNumber,
        otp: data.otp,
        expiresAt: data.expiresAt,
        attempts: data.attempts
      });
    }

    return otps;
  }
}

// Create singleton instance
const phoneVerificationService = new PhoneVerificationService();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  phoneVerificationService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

module.exports = phoneVerificationService;