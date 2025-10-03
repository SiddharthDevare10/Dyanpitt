const User = require('../models/User');
const Booking = require('../models/Booking');

class CleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  // Start the cleanup service with periodic execution
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    console.log(`Starting cleanup service with ${intervalMinutes} minute intervals`);
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
    console.log('Cleanup service stopped');
  }

  // Run the cleanup process
  async runCleanup() {
    try {
      console.log('Running cleanup tasks...');
      
      // 1. Cleanup expired temporary users
      const deletedTempUsers = await User.cleanupExpiredTempUsers();
      
      // 2. Cleanup expired cash payment requests
      const clearedCashRequests = await User.cleanupExpiredCashPaymentRequests();
      
      // 3. Cleanup expired cash payment bookings (48-hour deadline)
      const expiredBookings = await this.cleanupExpiredCashBookings();
      
      if (deletedTempUsers > 0 || clearedCashRequests > 0 || expiredBookings > 0) {
        console.log(`✅ Cleanup completed: Removed ${deletedTempUsers} expired temporary users, cleared ${clearedCashRequests} expired cash payment requests, cancelled ${expiredBookings} expired bookings`);
      } else {
        console.log('✅ Cleanup completed: No expired temporary users, cash payment requests, or bookings found');
      }
      
      return { deletedTempUsers, clearedCashRequests, expiredBookings };
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
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
            lastUpdated: new Date(),
            notes: 'Booking expired - Payment not completed within 48 hours'
          }
        }
      );

      console.log(`🕒 Cancelled ${result.modifiedCount} expired cash payment bookings (48+ hours old)`);
      return result.modifiedCount;

    } catch (error) {
      console.error('❌ Error cleaning up expired cash bookings:', error);
      return 0;
    }
  }

  // Manual cleanup trigger
  async manualCleanup() {
    console.log('Manual cleanup triggered...');
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