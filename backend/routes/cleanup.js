const logger = require('../utils/logger');
const express = require('express');
const User = require('../models/User');
const router = express.Router();

// @route   POST /api/cleanup/phone-conflicts
// @desc    Clean up phone number conflicts for incomplete registrations
// @access  Public (for development - should be protected in production)
router.post('/phone-conflicts', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Find users with this phone number who haven't completed registration
    const incompleteUsers = await User.find({
      phoneNumber,
      $or: [
        { isEmailVerified: false },
        { profileCompleted: false },
        { email: { $regex: /^temp_/ } }
      ]
    });

    // Delete incomplete users
    const deleteResult = await User.deleteMany({
      _id: { $in: incompleteUsers.map(u => u._id) }
    });

    res.json({
      success: true,
      message: `Cleaned up ${deleteResult.deletedCount} incomplete registrations with phone ${phoneNumber}`,
      deletedCount: deleteResult.deletedCount,
      cleanedUsers: incompleteUsers.map(u => ({
        id: u._id,
        email: u.email,
        isEmailVerified: u.isEmailVerified,
        profileCompleted: u.profileCompleted
      }))
    });

  } catch (error) {
    logger.error('Phone cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up phone conflicts',
      error: error.message
    });
  }
});

module.exports = router;