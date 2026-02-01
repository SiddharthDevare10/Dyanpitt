const logger = require('../utils/logger');
const { getCurrentIST, getISTStartOfDay } = require('../utils/istUtils');
const Booking = require('../models/Booking');

/**
 * Service to handle membership expiry checks and updates
 * This should be called periodically (e.g., daily via cron job)
 */
class MembershipExpiryService {
  
  /**
   * Update all expired memberships
   * Should be called daily or before any membership eligibility check
   */
  static async updateExpiredMemberships() {
    try {
      const today = getISTStartOfDay();
      
      logger.info('🔍 Checking for expired memberships...');
      
      // Find all active memberships that have expired
      const expiredMemberships = await Booking.find({
        membershipActive: true,
        membershipEndDate: { $lt: today },
        paymentStatus: { $in: ['completed', 'cash_collected'] }
      });
      
      logger.info(`Found ${expiredMemberships.length} expired but still active memberships`);
      
      if (expiredMemberships.length > 0) {
        // Log details of expired memberships
        expiredMemberships.forEach(membership => {
          logger.info(`⏰ Expiring membership: ${membership.userEmail} - ${membership.membershipType} - Ended: ${membership.membershipEndDate}`);
        });
        
        // Update them to inactive
        const result = await Booking.updateMany(
          {
            membershipActive: true,
            membershipEndDate: { $lt: today }
          },
          {
            membershipActive: false,
            lastUpdated: getCurrentIST()
          }
        );
        
        logger.info(`✅ Updated ${result.modifiedCount} expired memberships to inactive`);
        return result.modifiedCount;
      }
      
      logger.info('✅ No expired memberships found');
      return 0;
    } catch (error) {
      logger.error('❌ Error updating expired memberships:', error);
      return 0;
    }
  }

  /**
   * Get memberships expiring soon (within next 3 days)
   * Useful for sending reminder notifications
   */
  static async getMembershipsExpiringSoon(days = 3) {
    try {
      const today = getISTStartOfDay();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);
      
      const expiringSoon = await Booking.find({
        membershipActive: true,
        membershipEndDate: { 
          $gte: today,
          $lte: futureDate 
        },
        paymentStatus: { $in: ['completed', 'cash_collected'] }
      })
      .populate('userId', 'fullName email phoneNumber')
      .sort({ membershipEndDate: 1 });
      
      return expiringSoon;
    } catch (error) {
      logger.error('❌ Error getting memberships expiring soon:', error);
      return [];
    }
  }

  /**
   * Get detailed expiry report for admin dashboard
   */
  static async getExpiryReport() {
    try {
      const today = getISTStartOfDay();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const [expired, expiresToday, expiresThisWeek, total] = await Promise.all([
        // Already expired but still active (should be 0 if service is working)
        Booking.countDocuments({
          membershipActive: true,
          membershipEndDate: { $lt: today },
          paymentStatus: { $in: ['completed', 'cash_collected'] }
        }),
        
        // Expires today
        Booking.countDocuments({
          membershipActive: true,
          membershipEndDate: { 
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          },
          paymentStatus: { $in: ['completed', 'cash_collected'] }
        }),
        
        // Expires this week
        Booking.countDocuments({
          membershipActive: true,
          membershipEndDate: { 
            $gte: today,
            $lte: nextWeek 
          },
          paymentStatus: { $in: ['completed', 'cash_collected'] }
        }),
        
        // Total active memberships
        Booking.countDocuments({
          membershipActive: true,
          paymentStatus: { $in: ['completed', 'cash_collected'] }
        })
      ]);
      
      return {
        totalActive: total,
        alreadyExpired: expired,
        expiresToday: expiresToday,
        expiresThisWeek: expiresThisWeek,
        lastUpdated: getCurrentIST()
      };
    } catch (error) {
      logger.error('❌ Error generating expiry report:', error);
      return null;
    }
  }
}

module.exports = MembershipExpiryService;