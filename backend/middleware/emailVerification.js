const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * Middleware to ensure user has verified their email
 * Should be used after auth middleware
 */
const requireEmailVerification = async (req, res, next) => {
  try {
    // Get user from database (req.user.userId is set by auth middleware)
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before accessing this feature',
        code: 'EMAIL_NOT_VERIFIED',
        requiresAction: 'email_verification'
      });
    }

    // Check for incomplete temporary users
    if (user.email && user.email.includes('@temp.local')) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your registration first',
        code: 'REGISTRATION_INCOMPLETE',
        requiresAction: 'complete_registration'
      });
    }

    // User is verified, continue to next middleware
    next();
  } catch (error) {
    logger.error('Email verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification check'
    });
  }
};

/**
 * Middleware for routes that require profile completion
 * (after email verification)
 */
const requireProfileCompletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Skip profile completion check for admin users
    if (user.isAdmin()) {
      return next();
    }

    if (!user.profileCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your profile first',
        code: 'PROFILE_INCOMPLETE',
        requiresAction: 'complete_profile'
      });
    }

    next();
  } catch (error) {
    logger.error('Profile completion middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile check'
    });
  }
};

// Middleware to require membership completion (with admin bypass)
const requireMembershipCompletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Skip membership completion check for admin users
    if (user.isAdmin()) {
      return next();
    }

    if (!user.membershipCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Please complete your membership details first',
        code: 'MEMBERSHIP_INCOMPLETE',
        requiresAction: 'complete_membership'
      });
    }

    next();
  } catch (error) {
    logger.error('Membership completion middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during membership check'
    });
  }
};

module.exports = {
  requireEmailVerification,
  requireProfileCompletion,
  requireMembershipCompletion
};