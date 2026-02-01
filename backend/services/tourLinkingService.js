const logger = require('../utils/logger');
const TourRequest = require('../models/TourRequest');

/**
 * Service to link tour requests with user accounts
 */
class TourLinkingService {
  
  /**
   * Link existing tour requests to a newly registered user
   * @param {string} email - User's email address
   * @param {string} userId - User's MongoDB ID
   * @param {string} dyanpittId - User's Dyanpitt ID (optional, may be null)
   * @returns {Object} - Linking results
   */
  static async linkTourRequestsToUser(email, userId, dyanpittId = null) {
    try {
      // Find all tour requests for this email
      const tourRequests = await TourRequest.find({ 
        email: email.toLowerCase(),
        userId: { $exists: false } // Only link tours that haven't been linked yet
      });

      if (tourRequests.length === 0) {
        return {
          success: true,
          linkedCount: 0,
          message: 'No tour requests found to link'
        };
      }

      // Update all tour requests to include userId
      const updateResult = await TourRequest.updateMany(
        { 
          email: email.toLowerCase(),
          userId: { $exists: false }
        },
        { 
          $set: { 
            userId: userId,
            linkedAt: new Date(),
            // Add dyanpittId if available
            ...(dyanpittId && { dyanpittId: dyanpittId })
          }
        }
      );

      logger.info(`✅ Linked ${updateResult.modifiedCount} tour requests to user ${email}`);

      return {
        success: true,
        linkedCount: updateResult.modifiedCount,
        tourRequests: tourRequests.map(tr => ({
          tourId: tr._id,
          tourDate: tr.tourDate,
          tourTime: tr.tourTime,
          tourStatus: tr.tourStatus
        })),
        message: `Successfully linked ${updateResult.modifiedCount} tour request(s)`
      };

    } catch (error) {
      logger.error('Error linking tour requests:', error);
      return {
        success: false,
        linkedCount: 0,
        error: error.message,
        message: 'Failed to link tour requests'
      };
    }
  }

  /**
   * Update tour requests with Dyanpitt ID when it's generated
   * @param {string} email - User's email address
   * @param {string} dyanpittId - User's Dyanpitt ID
   * @returns {Object} - Update results
   */
  static async updateTourRequestsWithDyanpittId(email, dyanpittId) {
    try {
      const updateResult = await TourRequest.updateMany(
        { email: email.toLowerCase() },
        { $set: { dyanpittId: dyanpittId } }
      );

      logger.info(`✅ Updated ${updateResult.modifiedCount} tour requests with Dyanpitt ID ${dyanpittId}`);

      return {
        success: true,
        updatedCount: updateResult.modifiedCount,
        message: `Updated ${updateResult.modifiedCount} tour request(s) with Dyanpitt ID`
      };

    } catch (error) {
      logger.error('Error updating tour requests with Dyanpitt ID:', error);
      return {
        success: false,
        updatedCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get tour history for a user
   * @param {string} identifier - Email or user ID
   * @returns {Array} - User's tour requests
   */
  static async getUserTourHistory(identifier) {
    try {
      let query = {};
      
      // Determine if identifier is email or userId
      if (identifier.includes('@')) {
        query.email = identifier.toLowerCase();
      } else {
        query.userId = identifier;
      }

      const tourRequests = await TourRequest.find(query)
        .sort({ createdAt: -1 })
        .select('tourDate tourTime tourStatus examPreparation startDate createdAt');

      return {
        success: true,
        tours: tourRequests,
        count: tourRequests.length
      };

    } catch (error) {
      logger.error('Error getting tour history:', error);
      return {
        success: false,
        tours: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if user has any tour requests
   * @param {string} email - User's email address
   * @returns {Object} - Tour check results
   */
  static async checkUserTours(email) {
    try {
      const tourCount = await TourRequest.countDocuments({
        email: email.toLowerCase()
      });

      const latestTour = await TourRequest.findOne({
        email: email.toLowerCase()
      }).sort({ createdAt: -1 });

      return {
        success: true,
        hasTours: tourCount > 0,
        tourCount,
        latestTour: latestTour ? {
          tourId: latestTour._id,
          tourDate: latestTour.tourDate,
          tourTime: latestTour.tourTime,
          tourStatus: latestTour.tourStatus,
          examPreparation: latestTour.examPreparation
        } : null
      };

    } catch (error) {
      logger.error('Error checking user tours:', error);
      return {
        success: false,
        hasTours: false,
        tourCount: 0,
        latestTour: null,
        error: error.message
      };
    }
  }
}

module.exports = TourLinkingService;