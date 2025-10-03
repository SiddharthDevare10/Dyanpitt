/**
 * Service to manage membership status updates and expiration handling
 */

const Booking = require('../models/Booking');
// const cron = require('node-cron'); // Uncomment when node-cron is installed

class MembershipStatusService {
  
  // Update expired memberships - run daily at midnight
  static async updateExpiredMemberships() {
    try {
      console.log('🔄 Running membership expiration check...');
      const expiredCount = await Booking.updateExpiredMemberships();
      
      // Also update seat allocations
      const SeatAllocation = require('../models/SeatAllocation');
      const seatUpdates = await SeatAllocation.activateExpiredAllocations();
      
      if (expiredCount > 0 || seatUpdates.activated > 0 || seatUpdates.expired > 0) {
        console.log(`✅ Updated ${expiredCount} expired memberships`);
        console.log(`🪑 Seat allocations: ${seatUpdates.activated} activated, ${seatUpdates.expired} expired`);
        
        // Optionally send notifications to users about expired memberships
        await this.notifyExpiredMemberships();
      } else {
        console.log('ℹ️ No memberships or seat allocations to update');
      }
      
      return { expiredMemberships: expiredCount, seatUpdates };
    } catch (error) {
      console.error('❌ Error updating expired memberships:', error);
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
      console.error('❌ Error fetching expiring memberships:', error);
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
      
      console.log(`📧 Would send expiration notifications to ${recentlyExpired.length} users`);
      
      // TODO: Implement actual notification sending
      // await emailService.sendExpirationNotifications(recentlyExpired);
      
    } catch (error) {
      console.error('❌ Error sending expiration notifications:', error);
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
      console.error('❌ Error fetching membership stats:', error);
      throw error;
    }
  }
  
  // Initialize cron jobs (requires node-cron package)
  static initializeCronJobs() {
    try {
      const cron = require('node-cron');
      
      // Run every day at midnight to update expired memberships
      cron.schedule('0 0 * * *', async () => {
        console.log('🕛 Running daily membership status update...');
        await this.updateExpiredMemberships();
      }, {
        timezone: "Asia/Kolkata"
      });
      
      // Run every Monday at 9 AM to check expiring memberships
      cron.schedule('0 9 * * 1', async () => {
        console.log('📅 Weekly check for expiring memberships...');
        const expiring = await this.getMembershipsExpiringSoon();
        console.log(`⚠️ ${expiring.length} memberships expiring within 7 days`);
        
        // TODO: Send weekly summary to admins
      }, {
        timezone: "Asia/Kolkata"
      });
      
      console.log('⏰ Membership status cron jobs initialized');
    } catch (error) {
      console.log('ℹ️ Cron jobs not initialized - install node-cron package to enable automatic membership status updates');
      console.log('   Run: npm install node-cron');
    }
  }
  
  // Manual trigger for testing
  static async runManualCheck() {
    console.log('🔧 Running manual membership status check...');
    
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