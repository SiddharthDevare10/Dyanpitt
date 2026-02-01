const logger = require('../utils/logger');
/**
 * Service to manage membership status updates and expiration handling
 */

const Booking = require('../models/Booking');
// const cron = require('node-cron'); // Uncomment when node-cron is installed

class MembershipStatusService {
  
  // Update expired memberships - run daily at midnight
  static async updateExpiredMemberships() {
    try {
      logger.info('🔄 Running membership expiration check...');
      const expiredCount = await Booking.updateExpiredMemberships();
      
      // Also update seat allocations
      // Note: Seat allocation management removed - handled manually by admin
      const seatUpdates = { activated: 0, expired: 0 };
      
      if (expiredCount > 0 || seatUpdates.activated > 0 || seatUpdates.expired > 0) {
        logger.info(`✅ Updated ${expiredCount} expired memberships`);
        logger.info(`🪑 Seat allocations: ${seatUpdates.activated} activated, ${seatUpdates.expired} expired`);
        
        // Optionally send notifications to users about expired memberships
        await this.notifyExpiredMemberships();
      } else {
        logger.info('ℹ️ No memberships or seat allocations to update');
      }
      
      return { expiredMemberships: expiredCount, seatUpdates };
    } catch (error) {
      logger.error('❌ Error updating expired memberships:', error);
      throw error;
    }
  }
  
  // Get users with memberships expiring soon (within next 7 days)
  static async getMembershipsExpiringSoon() {
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const expiringSoon = await Booking.find({
        membershipActive: true,
        paymentStatus: { $in: ['completed', 'cash_collected'] },
        membershipEndDate: {
          $gte: today,
          $lte: nextWeek
        }
      })
      .populate('userId', 'fullName email phoneNumber dyanpittId')
      .sort({ membershipEndDate: 1 });
      
      return expiringSoon.map(booking => {
        const daysLeft = Math.ceil((new Date(booking.membershipEndDate) - today) / (1000 * 60 * 60 * 24));
        return {
          ...booking.toObject(),
          daysLeft,
          isExpiringSoon: daysLeft <= 3,
          isExpiringToday: daysLeft === 0
        };
      });
    } catch (error) {
      logger.error('❌ Error fetching expiring memberships:', error);
      throw error;
    }
  }
  
  // Send notifications for expired memberships
  static async notifyExpiredMemberships() {
    try {
      // This is where you would integrate with email/SMS services
      // For now, just log the notification
      const recentlyExpired = await Booking.find({
        membershipActive: false,
        paymentStatus: { $in: ['completed', 'cash_collected'] },
        membershipEndDate: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          $lt: new Date()
        }
      })
      .populate('userId', 'fullName email phoneNumber')
      .limit(50);
      
      logger.info(`📧 Would send expiration notifications to ${recentlyExpired.length} users`);
      
      // Implement actual notification sending via email service
      // Note: Email notifications are handled by emailService.js
      // This can be extended to send SMS or push notifications
      // For now, admins can see expired memberships in the dashboard
      if (recentlyExpired.length > 0) {
        logger.info(`Notification system ready - ${recentlyExpired.length} users to be notified`);
        // Future: Integrate with emailService to send expiration reminders
        // await emailService.sendMembershipExpirationNotifications(recentlyExpired);
      }
      // await emailService.sendExpirationNotifications(recentlyExpired);
      
    } catch (error) {
      logger.error('❌ Error sending expiration notifications:', error);
    }
  }
  
  // Get membership statistics for dashboard
  static async getMembershipStats() {
    try {
      const today = new Date();
      
      const stats = await Booking.aggregate([
        {
          $match: {
            paymentStatus: { $in: ['completed', 'cash_collected'] }
          }
        },
        {
          $group: {
            _id: null,
            totalMemberships: { $sum: 1 },
            activeMemberships: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$membershipActive', true] },
                      { $gte: ['$membershipEndDate', today] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            expiredMemberships: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$membershipActive', false] },
                      { $lt: ['$membershipEndDate', today] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            upcomingMemberships: {
              $sum: {
                $cond: [
                  { $gt: ['$membershipStartDate', today] },
                  1,
                  0
                ]
              }
            },
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      return stats[0] || {
        totalMemberships: 0,
        activeMemberships: 0,
        expiredMemberships: 0,
        upcomingMemberships: 0,
        totalRevenue: 0
      };
      
    } catch (error) {
      logger.error('❌ Error fetching membership stats:', error);
      throw error;
    }
  }
  
  // Initialize cron jobs (requires node-cron package)
  static initializeCronJobs() {
    try {
      const cron = require('node-cron');
      
      // Run every day at midnight to update expired memberships
      cron.schedule('0 0 * * *', async () => {
        logger.info('🕛 Running daily membership status update...');
        await this.updateExpiredMemberships();
      }, {
        timezone: "Asia/Kolkata"
      });
      
      // Run every Monday at 9 AM to check expiring memberships
      cron.schedule('0 9 * * 1', async () => {
        logger.info('📅 Weekly check for expiring memberships...');
        const expiring = await this.getMembershipsExpiringSoon();
        logger.info(`⚠️ ${expiring.length} memberships expiring within 7 days`);
        
        // Send weekly summary to admins
        if (expiring.length > 0) {
          logger.info(`Weekly summary: ${expiring.length} memberships expiring soon`);
          // Future: Send email summary to admin
          // await emailService.sendWeeklySummaryToAdmin(expiring);
          // For now, admins can view this in the dashboard analytics
        }
      }, {
        timezone: "Asia/Kolkata"
      });
      
      logger.info('⏰ Membership status cron jobs initialized');
    } catch {
      logger.info('ℹ️ Cron jobs not initialized - install node-cron package to enable automatic membership status updates');
      logger.info('   Run: npm install node-cron');
    }
  }
  
  // Manual trigger for testing
  static async runManualCheck() {
    logger.info('🔧 Running manual membership status check...');
    
    const expired = await this.updateExpiredMemberships();
    const expiring = await this.getMembershipsExpiringSoon();
    const stats = await this.getMembershipStats();
    
    return {
      expiredCount: expired,
      expiringSoon: expiring.length,
      stats
    };
  }
}

module.exports = MembershipStatusService;