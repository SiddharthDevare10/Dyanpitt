const User = require('../models/User');

class CleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  // Start the cleanup service with periodic execution
  start(intervalMinutes = 1) {
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
      console.log('Running temporary user cleanup...');
      
      // Use the static method from User model to cleanup expired temp users
      const deletedCount = await User.cleanupExpiredTempUsers();
      
      if (deletedCount > 0) {
        console.log(`✅ Cleanup completed: Removed ${deletedCount} expired temporary users`);
      } else {
        console.log('✅ Cleanup completed: No expired temporary users found');
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
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