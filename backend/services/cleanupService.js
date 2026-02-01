const logger = require('../utils/logger');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { getCurrentIST } = require('../utils/istUtils');

class CleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  // Start the cleanup service with periodic execution
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the cleanup service
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
  }

  // Run the cleanup process
  async runCleanup() {
    try {
      
      // 1. Cleanup expired temporary users
      const deletedTempUsers = await User.cleanupExpiredTempUsers();
      
      // 2. Cleanup expired cash payment requests
      const clearedCashRequests = await User.cleanupExpiredCashPaymentRequests();
      
      // 3. Cleanup expired cash payment bookings (48-hour deadline)
      const expiredBookings = await this.cleanupExpiredCashBookings();
      
      // Cleanup completed silently
      
      return { deletedTempUsers, clearedCashRequests, expiredBookings };
    } catch (error) {
      logger.error('❌ Error during cleanup:', error);
      return { deletedTempUsers: 0, clearedCashRequests: 0, expiredBookings: 0 };
    }
  }

  // Cleanup expired cash payment bookings (48-hour deadline)
  async cleanupExpiredCashBookings() {
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      // Find bookings with cash_pending status that are older than 48 hours
      const expiredBookings = await Booking.find({
        paymentStatus: 'cash_pending',
        bookedAt: { $lt: fortyEightHoursAgo },
        isActive: true
      });

      if (expiredBookings.length === 0) {
        return 0;
      }

      // Update expired bookings to cancelled status
      const result = await Booking.updateMany(
        {
          paymentStatus: 'cash_pending',
          bookedAt: { $lt: fortyEightHoursAgo },
          isActive: true
        },
        {
          $set: {
            paymentStatus: 'expired',
            isActive: false,
            lastUpdated: getCurrentIST(),
            notes: 'Booking expired - Payment not completed within 48 hours'
          }
        }
      );

      return result.modifiedCount;

    } catch (error) {
      logger.error('❌ Error cleaning up expired cash bookings:', error);
      return 0;
    }
  }

  // Manual cleanup trigger
  async manualCleanup() {
    return await this.runCleanup();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.cleanupInterval
    };
  }
}

// Export singleton instance
module.exports = new CleanupService();