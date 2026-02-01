const logger = require('../utils/logger');
const express = require('express');
const { getCurrentIST } = require('../utils/istUtils');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { authenticateToken: auth } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

const router = express.Router();

// Get all bookings (Admin only) - with filtering and pagination
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Parse filters
    const filters = {};
    if (req.query.paymentStatus) filters.paymentStatus = req.query.paymentStatus;
    if (req.query.membershipType) filters.membershipType = req.query.membershipType;
    if (req.query.timeSlot) filters.timeSlot = req.query.timeSlot;
    if (req.query.membershipActive !== undefined) filters.membershipActive = req.query.membershipActive === 'true';
    if (req.query.search) filters.searchTerm = req.query.search;

    // Use User model with booking aggregation instead
    const result = await User.getAllUsersWithBookings(page, limit, filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

// Check seat availability for a date range (public endpoint)
router.get('/check-seat-availability', async (req, res) => {
  try {
    const { membershipType, timeSlot, startDate, endDate } = req.query;

    if (!membershipType || !timeSlot || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: membershipType, timeSlot, startDate, endDate'
      });
    }

    const requestedStartDate = new Date(startDate);
    const requestedEndDate = new Date(endDate);

    // Validate dates
    if (isNaN(requestedStartDate.getTime()) || isNaN(requestedEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please provide valid ISO date strings.'
      });
    }

    // Validate end date is not before start date
    if (requestedEndDate < requestedStartDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range. End date cannot be before start date.'
      });
    }

    // Set to start/end of day for accurate comparison
    requestedStartDate.setHours(0, 0, 0, 0);
    requestedEndDate.setHours(23, 59, 59, 999);

    // Find all bookings that overlap with the requested date range
    // Overlap condition: (StartA <= EndB) AND (EndA >= StartB)
    const overlappingBookings = await Booking.find({
      membershipType: membershipType,
      timeSlot: timeSlot,
      $or: [
        { membershipActive: true, paymentStatus: { $in: ['completed', 'cash_collected'] } },
        { paymentStatus: 'cash_pending', isActive: true }
      ],
      // Date range overlap check
      membershipStartDate: { $lte: requestedEndDate },
      membershipEndDate: { $gte: requestedStartDate },
      isActive: true,
      preferredSeat: { $exists: true, $ne: '' } // Only include bookings with seats
    }).select('preferredSeat membershipStartDate membershipEndDate');

    // Extract occupied seat numbers
    const occupiedSeats = overlappingBookings.map(booking => booking.preferredSeat);

    logger.info('Seat availability check:', {
      membershipType,
      timeSlot,
      requestedRange: `${requestedStartDate.toISOString()} - ${requestedEndDate.toISOString()}`,
      overlappingBookings: overlappingBookings.length,
      occupiedSeats
    });

    res.json({
      success: true,
      occupiedSeats: occupiedSeats,
      count: occupiedSeats.length
    });

  } catch (error) {
    logger.error('Check seat availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check seat availability'
    });
  }
});

// Check if user can create new membership (MOVED BEFORE /:bookingId to avoid conflict)
router.get('/check-eligibility', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // CRITICAL: First update any expired memberships before checking eligibility
    await Booking.updateExpiredMemberships();

    // Get active bookings from separate Booking table
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      membershipActive: true,
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      membershipEndDate: { $gte: today }
    });

    const hasActiveMembership = activeBookings.length > 0;
    
    res.json({
      success: true,
      data: {
        canCreateNewMembership: !hasActiveMembership,
        hasActiveMembership,
        hasDnyanpittId: user.hasDnyanpittId,
        dyanpittId: user.dyanpittId,
        activeBookings: activeBookings,
        userStatus: {
          isFirstTime: !user.hasDnyanpittId,
          isReturning: user.hasDnyanpittId && !hasActiveMembership,
          hasActive: hasActiveMembership
        }
      }
    });

  } catch (error) {
    logger.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check membership eligibility'
    });
  }
});

// Get pending cash payments for admin (MOVED BEFORE /:bookingId to avoid route conflict)
router.get('/pending-cash-payments', auth, async (req, res) => {
  
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.userId);
    
    if (!adminUser || !adminUser.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    

    // Calculate the 48-hour expiry threshold for cash_pending bookings
    const cashPaymentExpiryThreshold = new Date();
    cashPaymentExpiryThreshold.setHours(cashPaymentExpiryThreshold.getHours() - 48);
    
    // Fetch all pending cash bookings (exclude expired ones)
    const pendingBookings = await Booking.find({
      paymentStatus: 'cash_pending',
      isActive: true,
      bookedAt: { $gte: cashPaymentExpiryThreshold } // Only include bookings within 48 hours
    })
    .populate('userId', 'fullName email phoneNumber dyanpittId')
    .sort({ bookedAt: -1 });

    logger.info('🔍 Found pending bookings:', pendingBookings.length);
    logger.info('🔍 Sample booking data:', pendingBookings[0] ? {
      id: pendingBookings[0]._id,
      userId: pendingBookings[0].userId,
      paymentStatus: pendingBookings[0].paymentStatus,
      userEmail: pendingBookings[0].userEmail
    } : 'No bookings found');

    // Transform data to match the expected format
    const formattedBookings = pendingBookings.map(booking => ({
      userId: booking.userId._id,
      bookingId: booking._id,
      fullName: booking.userId.fullName,
      email: booking.userId.email,
      phoneNumber: booking.userId.phoneNumber,
      dyanpittId: booking.userId.dyanpittId,
      membershipType: booking.membershipType,
      duration: booking.membershipDuration,
      timeSlot: booking.timeSlot,
      totalAmount: booking.totalAmount,
      preferredSeat: booking.preferredSeat,
      transactionId: booking.transactionId,
      paymentId: booking.paymentId,
      requestDate: booking.bookedAt,
      membershipStartDate: booking.membershipStartDate,
      membershipEndDate: booking.membershipEndDate,
      notes: booking.notes
    }));


    const responseData = {
      success: true,
      pendingBookings: formattedBookings,
      count: formattedBookings.length
    };
    
    logger.info('📤 Sending response:', {
      success: responseData.success,
      count: responseData.count,
      sampleData: responseData.pendingBookings[0] || 'No data'
    });

    res.json(responseData);

  } catch (error) {
    logger.error('❌ Error fetching pending cash payments:', error.message);
    logger.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending cash payments',
      error: error.message
    });
  }
});

// Get specific booking by ID
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    
    // Check if requesting user is the owner or admin
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find user with this booking
    const user = await User.findOne({
      'bookings._id': bookingId
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check access permissions
    if (user._id.toString() !== req.user.userId && !requestingUser.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get the specific booking
    const booking = user.getBookingById(bookingId);

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    logger.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details'
    });
  }
});

// Get current user's bookings
router.get('/user/me', auth, async (req, res) => {
  try {
    // Get user with bookings (merged structure)
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all bookings from separate Booking table
    const bookings = await Booking.find({ userId: user._id }).sort({ bookedAt: -1 });

    res.json({
      success: true,
      data: bookings
    });

  } catch (error) {
    logger.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details'
    });
  }
});

// Get current user's active memberships
router.get('/user/active', auth, async (req, res) => {
  try {
    // Get user with bookings (merged structure)
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get active bookings from separate Booking table (including cash pending)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the 48-hour expiry threshold for cash_pending bookings
    const cashPaymentExpiryThreshold = new Date();
    cashPaymentExpiryThreshold.setHours(cashPaymentExpiryThreshold.getHours() - 48);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      $or: [
        { membershipActive: true, membershipEndDate: { $gte: today } },
        { 
          paymentStatus: 'cash_pending',
          bookedAt: { $gte: cashPaymentExpiryThreshold } // Only include cash_pending bookings within 48 hours
        }
      ]
    });

    res.json({
      success: true,
      data: activeBookings
    });

  } catch (error) {
    logger.error('Get active bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active bookings'
    });
  }
});

// Validate booking details (without saving to database)
router.post('/create', auth, async (req, res) => {
  try {
    const bookingDetails = req.body;
    
    // Validate required fields
    const requiredFields = ['timeSlot', 'membershipType', 'membershipDuration', 'membershipStartDate', 'totalAmount'];
    
    for (const field of requiredFields) {
      if (!bookingDetails[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // CRITICAL: First update any expired memberships before checking eligibility
    await Booking.updateExpiredMemberships();

    // Check if user already has an active membership
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      membershipActive: true,
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      membershipEndDate: { $gte: today }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership. Only one active membership is allowed at a time.',
        activeMembership: activeBookings[0]
      });
    }

    // Calculate membership end date based on start date and duration
    const startDate = new Date(bookingDetails.membershipStartDate);
    let endDate = new Date(startDate);
    
    // Calculate end date based on duration
    const duration = bookingDetails.membershipDuration;
    if (duration.includes('Day')) {
      const days = parseInt(duration.match(/\d+/)[0]);
      endDate.setDate(startDate.getDate() + days - 1); // -1 because the start date is included
    } else if (duration.includes('Month')) {
      const months = parseInt(duration.match(/\d+/)[0]);
      endDate.setMonth(startDate.getMonth() + months);
      endDate.setDate(startDate.getDate() - 1); // -1 because the start date is included
    }

    // Only update user completion status, don't save booking yet
    user.bookingCompleted = true;
    await user.save();

    // Prepare booking data for payment (without saving to database)
    const responseData = {
      // Generate temporary ID for tracking
      tempId: `temp_${Date.now()}_${user._id}`,
      timeSlot: bookingDetails.timeSlot,
      membershipType: bookingDetails.membershipType,
      membershipDuration: bookingDetails.membershipDuration,
      membershipStartDate: bookingDetails.membershipStartDate,
      membershipEndDate: endDate,
      totalAmount: bookingDetails.totalAmount,
      paymentStatus: 'pending',
      paymentMethod: bookingDetails.paymentMethod,
      preferredSeat: bookingDetails.preferredSeat,
      notes: bookingDetails.notes || ''
    };
    
    const userProfile = user.getPublicProfile();
    
    
    res.json({
      success: true,
      message: 'Booking details validated, proceed to payment',
      data: responseData,
      user: userProfile
    });

  } catch (error) {
    logger.error('Validate booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate booking details'
    });
  }
});

// Update booking details (before payment)
router.put('/update/:bookingId', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const updates = req.body;

    // Get user with this booking
    const user = await User.findOne({
      'bookings._id': bookingId,
      '_id': req.user.userId
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    // Get the specific booking
    const booking = user.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Don't allow updates if payment is completed
    if (booking.paymentStatus === 'completed' || booking.paymentStatus === 'cash_collected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update booking after payment completion'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['timeSlot', 'membershipType', 'membershipDuration', 'membershipStartDate', 'preferredSeat'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        booking[field] = updates[field];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        id: booking._id,
        timeSlot: booking.timeSlot,
        membershipType: booking.membershipType,
        membershipDuration: booking.membershipDuration,
        membershipStartDate: booking.membershipStartDate,
        membershipEndDate: booking.membershipEndDate,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        lastUpdated: booking.lastUpdated
      }
    });

  } catch (error) {
    logger.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
});

// Complete payment and create booking in database
router.post('/complete-payment', auth, async (req, res) => {
  try {
    const { bookingData, paymentId, paymentMethod, transactionId } = req.body;

    // Validate required fields
    if (!bookingData || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Booking data and payment ID are required'
      });
    }

    // Calculate missing fields if not provided
    if (!bookingData.totalAmount) {
      // Set a default amount for now to avoid errors
      bookingData.totalAmount = 1000; // Default amount - will be calculated properly later
    }

    // Calculate membership end date if not provided
    if (!bookingData.membershipEndDate) {
      const startDate = new Date(bookingData.membershipStartDate);
      let endDate = new Date(startDate);
      
      const duration = bookingData.membershipDuration;
      if (duration.includes('Day')) {
        const days = parseInt(duration.match(/\d+/)[0]);
        endDate.setDate(startDate.getDate() + days - 1);
      } else if (duration.includes('Month')) {
        const months = parseInt(duration.match(/\d+/)[0]);
        endDate.setMonth(startDate.getMonth() + months);
        endDate.setDate(startDate.getDate() - 1);
      }
      
      bookingData.membershipEndDate = endDate;
    }

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has an active membership (double-check)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      membershipActive: true,
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      membershipEndDate: { $gte: today }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership. Payment cancelled.',
        activeMembership: activeBookings[0]
      });
    }

    // Assign Dyanpitt ID if this is the first membership (BEFORE creating booking)
    let dyanpittIdData = null;
    if (!user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        
        // Update the user object with the new ID
        user.dyanpittId = dyanpittIdData.dyanpittId;
        user.hasDnyanpittId = true;
        
      } catch (error) {
        logger.error('❌ Failed to assign Dyanpitt ID:', error);
        logger.error('❌ Error details:', error.message);
        logger.error('❌ Error stack:', error.stack);
      }
    } else {
      // Error already logged
    }

    // Deactivate any existing active bookings for this user
    await Booking.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, lastUpdated: getCurrentIST() }
    );

    // Determine payment status and membership activation based on payment method
    const finalPaymentStatus = paymentMethod === 'cash' ? 'cash_pending' : 'completed';
    const isMembershipActive = paymentMethod !== 'cash'; // Only activate for non-cash payments
    
    // Get current IST time
    const istTime = getCurrentIST();

    // Now create the booking in database with payment information
    const newBooking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId || null, // Use newly assigned or existing Dyanpeeth ID
      timeSlot: bookingData.timeSlot,
      membershipType: bookingData.membershipType,
      membershipDuration: bookingData.membershipDuration,
      membershipStartDate: new Date(bookingData.membershipStartDate),
      membershipEndDate: new Date(bookingData.membershipEndDate),
      totalAmount: bookingData.totalAmount,
      paymentStatus: finalPaymentStatus,
      paymentMethod: paymentMethod,
      paymentId: paymentId,
      transactionId: transactionId,
      preferredSeat: bookingData.preferredSeat,
      notes: bookingData.notes || '',
      paymentDate: paymentMethod !== 'cash' ? istTime : null, // IST payment date for non-cash payments
      paymentTime: paymentMethod !== 'cash' ? istTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : null, // IST payment time (24-hour format)
      membershipActive: isMembershipActive,
      isActive: true,
      bookedAt: istTime, // IST booking time
      lastUpdated: istTime
    });
    
    await newBooking.save();

    // Note: Seat allocation will be handled manually by admin
    // seatAllocation variable removed - handled manually


    // CRITICAL: Update user's booking and payment status + bookingDetails
    user.bookingCompleted = true;
    user.paymentCompleted = true;
    user.hasDnyanpittId = dyanpittIdData ? true : user.hasDnyanpittId;
    user.dyanpittId = dyanpittIdData?.dyanpittId || user.dyanpittId;
    
    // Update user's booking details for frontend redirection logic
    user.bookingDetails = {
      timeSlot: newBooking.timeSlot,
      membershipType: newBooking.membershipType,
      membershipDuration: newBooking.membershipDuration,
      membershipStartDate: newBooking.membershipStartDate,
      membershipEndDate: newBooking.membershipEndDate,
      totalAmount: newBooking.totalAmount,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
      paymentId: newBooking.paymentId,
      transactionId: newBooking.transactionId,
      membershipActive: newBooking.membershipActive,
      bookedAt: newBooking.bookedAt,
      paymentDate: newBooking.paymentDate,
      preferredSeat: newBooking.preferredSeat
    };
    
    await user.save();
    
    // CRITICAL: Update Membership table with Dyanpitt ID if user has a membership
    if (dyanpittIdData?.dyanpittId) {
      const Membership = require('../models/Membership');
      try {
        await Membership.updateOne(
          { userId: user._id },
          { dyanpittId: dyanpittIdData.dyanpittId },
          { sort: { createdAt: -1 } } // Update the most recent membership
        );
      } catch (membershipError) {
        logger.error('❌ Failed to update membership with Dyanpitt ID:', membershipError);
      }
    }

    const responseData = {
      id: newBooking._id,
      timeSlot: newBooking.timeSlot,
      membershipType: newBooking.membershipType,
      membershipDuration: newBooking.membershipDuration,
      membershipStartDate: newBooking.membershipStartDate,
      membershipEndDate: newBooking.membershipEndDate,
      totalAmount: newBooking.totalAmount,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
      paymentId: newBooking.paymentId,
      transactionId: newBooking.transactionId,
      membershipActive: newBooking.membershipActive,
      bookedAt: newBooking.bookedAt,
      paymentDate: newBooking.paymentDate
    };

    // Reload user to get the updated Dyanpitt ID
    const updatedUser = await User.findById(user._id);
    
    logger.info('📋 Final response data:', {
      generatedId: dyanpittIdData?.dyanpittId,
      userIdFromDB: updatedUser.dyanpittId,
      userHasId: updatedUser.hasDnyanpittId
    });

    res.json({
      success: true,
      message: 'Payment completed and booking created successfully',
      data: responseData,
      dyanpittId: dyanpittIdData?.dyanpittId || updatedUser.dyanpittId,
      transactionId: responseData.transactionId
    });

  } catch (error) {
    logger.error('❌ Complete payment and create booking error:', error);
    logger.error('❌ Error stack:', error.stack);
    logger.error('❌ Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment and create booking',
      error: error.message // Include actual error message for debugging
    });
  }
});

// Create cash payment request (2-day window)
router.post('/create-cash-payment-request', auth, async (req, res) => {
  try {
    const { bookingData, transactionId } = req.body;

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has an active membership
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      membershipActive: true,
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      membershipEndDate: { $gte: today }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership.',
        activeMembership: activeBookings[0]
      });
    }

    // Create cash payment request (expires in 2 days)
    const expiresAt = getCurrentIST();
    expiresAt.setDate(expiresAt.getDate() + 2); // 2 days from now

    const cashPaymentRequest = {
      userId: user._id,
      userEmail: user.email,
      transactionId: transactionId,
      bookingData: bookingData,
      status: 'pending_admin_review',
      requestedAt: getCurrentIST(),
      expiresAt: expiresAt
    };

    // Store in user document temporarily (will be cleaned up after 2 days)
    user.pendingCashPaymentRequest = cashPaymentRequest;
    await user.save();

    logger.info('💰 Cash payment request created:', {
      user: user.email,
      transactionId: transactionId,
      expiresAt: expiresAt
    });

    res.json({
      success: true,
      message: 'Cash payment request created. Please visit the center within 2 days.',
      data: {
        transactionId: transactionId,
        expiresAt: expiresAt,
        bookingData: bookingData,
        status: 'pending_admin_review'
      }
    });

  } catch (error) {
    logger.error('Create cash payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cash payment request'
    });
  }
});

// Admin route: Get all pending cash payment requests
// REMOVED: Duplicate endpoint - using the correct Booking table implementation below

// REMOVED: First duplicate confirm-cash-payment endpoint - using the correct Booking table implementation below

// Update payment status for a booking
router.patch('/:bookingId/update-payment-status', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }

    // Find and update the booking
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, userId: req.user.userId },
      { 
        paymentStatus: paymentStatus,
        lastUpdated: getCurrentIST()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        id: booking._id,
        paymentStatus: booking.paymentStatus,
        lastUpdated: booking.lastUpdated
      }
    });

  } catch (error) {
    logger.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
});

// Create cash payment request
router.post('/cash-payment-request/:bookingId', auth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Get user with bookings (merged structure)
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the booking in user's bookings array
    const booking = user.getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Create cash payment request using user method
    await user.createCashPaymentRequest(bookingId);

    res.json({
      success: true,
      message: 'Cash payment request created successfully',
      data: {
        id: booking._id,
        timeSlot: booking.timeSlot,
        membershipType: booking.membershipType,
        membershipDuration: booking.membershipDuration,
        membershipStartDate: booking.membershipStartDate,
        membershipEndDate: booking.membershipEndDate,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        cashPaymentRequest: booking.cashPaymentRequest,
        membershipActive: booking.membershipActive,
        bookedAt: booking.bookedAt
      }
    });

  } catch (error) {
    logger.error('Cash payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cash payment request'
    });
  }
});

// REMOVED: Second duplicate endpoint - using the correct Booking table implementation below

// Confirm cash payment collection (Admin only)
router.post('/admin/confirm-cash-payment/:bookingId', auth, async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.user.userId);
    if (!admin || !admin.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const bookingId = req.params.bookingId;
    const { adminNotes = '' } = req.body;

    // Find user with this booking
    const user = await User.findOne({
      'bookings._id': bookingId,
      'bookings.paymentStatus': 'cash_pending'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not pending cash payment'
      });
    }

    // Confirm cash payment using user method
    await user.collectCashPayment(bookingId, admin.fullName, adminNotes);

    // Get updated booking
    const updatedBooking = user.getBookingById(bookingId);

    res.json({
      success: true,
      message: 'Cash payment confirmed successfully',
      data: {
        id: updatedBooking._id,
        paymentStatus: updatedBooking.paymentStatus,
        membershipActive: updatedBooking.membershipActive,
        paymentDate: updatedBooking.paymentDate,
        cashPaymentRequest: updatedBooking.cashPaymentRequest
      }
    });

  } catch (error) {
    logger.error('Confirm cash payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm cash payment'
    });
  }
});

// Get booking statistics (Admin only)
router.get('/admin/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const stats = await User.aggregate([
      { $unwind: '$bookings' },
      { $match: { 'bookings.isActive': true } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          activeMembers: {
            $sum: { $cond: [{ $eq: ['$bookings.membershipActive', true] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$bookings.paymentStatus', 'pending'] }, 1, 0] }
          },
          cashPending: {
            $sum: { $cond: [{ $eq: ['$bookings.paymentStatus', 'cash_pending'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { 
              $cond: [
                { $in: ['$bookings.paymentStatus', ['completed', 'cash_collected']] },
                '$bookings.totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    const membershipTypeStats = await User.aggregate([
      { $unwind: '$bookings' },
      { $match: { 'bookings.isActive': true } },
      {
        $group: {
          _id: '$bookings.membershipType',
          count: { $sum: 1 },
          revenue: {
            $sum: { 
              $cond: [
                { $in: ['$bookings.paymentStatus', ['completed', 'cash_collected']] },
                '$bookings.totalAmount',
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const timeSlotStats = await User.aggregate([
      { $unwind: '$bookings' },
      { $match: { 'bookings.isActive': true } },
      {
        $group: {
          _id: '$bookings.timeSlot',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalBookings: 0,
          activeMembers: 0,
          pendingPayments: 0,
          cashPending: 0,
          totalRevenue: 0
        },
        membershipTypes: membershipTypeStats,
        timeSlots: timeSlotStats
      }
    });

  } catch (error) {
    logger.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics'
    });
  }
});

// Export booking data (Admin only)
router.get('/admin/export', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const format = req.query.format || 'json';
    
    // Get all bookings without pagination using aggregation
    const bookingsData = await User.aggregate([
      { $unwind: '$bookings' },
      { $match: { 'bookings.isActive': true } },
      {
        $project: {
          _id: '$bookings._id',
          userFullName: '$fullName',
          userEmail: '$email', 
          userDyanpittId: '$dyanpittId',
          userPhoneNumber: '$phoneNumber',
          membershipType: '$bookings.membershipType',
          timeSlot: '$bookings.timeSlot',
          membershipDuration: '$bookings.membershipDuration',
          membershipStartDate: '$bookings.membershipStartDate',
          membershipEndDate: '$bookings.membershipEndDate',
          totalAmount: '$bookings.totalAmount',
          paymentStatus: '$bookings.paymentStatus',
          paymentMethod: '$bookings.paymentMethod',
          paymentDate: '$bookings.paymentDate',
          bookedAt: '$bookings.bookedAt'
        }
      },
      { $sort: { bookedAt: -1 } }
    ]);

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Full Name', 'Email', 'Dyanpitt ID', 'Phone Number', 'Membership Type',
        'Time Slot', 'Duration', 'Start Date', 'End Date', 'Total Amount',
        'Payment Status', 'Payment Method', 'Payment Date', 'Booked At'
      ];

      const csvRows = bookingsData.map(booking => [
        booking.userFullName,
        booking.userEmail,
        booking.userDyanpittId || '',
        booking.userPhoneNumber,
        booking.membershipType,
        booking.timeSlot,
        booking.membershipDuration,
        booking.membershipStartDate?.toISOString().split('T')[0] || '',
        booking.membershipEndDate?.toISOString().split('T')[0] || '',
        booking.totalAmount,
        booking.paymentStatus,
        booking.paymentMethod,
        booking.paymentDate?.toISOString() || '',
        booking.bookedAt?.toISOString() || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: bookingsData,
        total: bookingsData.length,
        exportedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Export booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export booking data'
    });
  }
});

// Create booking immediately for cash payment (with pending status)
router.post('/create-cash-booking', auth, requireEmailVerification, async (req, res) => {
  try {
    const bookingData = req.body;
    
    // Validate required fields
    const requiredFields = ['timeSlot', 'membershipType', 'membershipDuration', 'membershipStartDate', 'totalAmount'];
    
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // CRITICAL: First update any expired memberships before checking eligibility
    await Booking.updateExpiredMemberships();

    // Calculate the 48-hour expiry threshold for cash_pending bookings
    const cashPaymentExpiryThreshold = new Date();
    cashPaymentExpiryThreshold.setHours(cashPaymentExpiryThreshold.getHours() - 48);
    
    // Check if user already has an active membership or pending cash payment
    const existingBookings = await Booking.find({
      userId: user._id,
      $or: [
        { paymentStatus: { $in: ['completed', 'cash_collected'] }, membershipActive: true },
        { 
          paymentStatus: 'cash_pending', 
          isActive: true,
          bookedAt: { $gte: cashPaymentExpiryThreshold } // Only check non-expired cash_pending bookings
        }
      ]
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership or pending payment.',
        existingBooking: existingBookings[0]
      });
    }

    // ============================================
    // EDGE CASE VALIDATIONS FOR DATE AND SEAT
    // ============================================
    
    // Validate start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestedStartDate = new Date(bookingData.membershipStartDate);
    requestedStartDate.setHours(0, 0, 0, 0);
    
    if (requestedStartDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book for past dates. Please select a current or future date.',
        code: 'INVALID_START_DATE'
      });
    }
    
    // Validate start date is not too far in the future (max 6 months)
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 6);
    if (requestedStartDate > maxFutureDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book more than 6 months in advance.',
        code: 'START_DATE_TOO_FAR'
      });
    }
    
    // Validate membership duration format
    const duration = bookingData.membershipDuration;
    if (!duration || (!duration.includes('Day') && !duration.includes('Month'))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership duration format. Must contain "Day" or "Month".',
        code: 'INVALID_DURATION'
      });
    }
    
    // CRITICAL: Check if preferred seat is already occupied (prevent double-booking)
    // Check for date range overlap, not just current occupancy
    if (bookingData.preferredSeat) {
      const requestedEndDate = new Date(bookingData.membershipStartDate);
      
      // Calculate end date based on duration
      if (duration.includes('Day')) {
        const days = parseInt(duration);
        if (isNaN(days) || days <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid duration value. Must be a positive number.',
            code: 'INVALID_DURATION_VALUE'
          });
        }
        requestedEndDate.setDate(requestedStartDate.getDate() + days - 1);
      } else if (duration.includes('Month')) {
        const months = parseInt(duration);
        if (isNaN(months) || months <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid duration value. Must be a positive number.',
            code: 'INVALID_DURATION_VALUE'
          });
        }
        requestedEndDate.setMonth(requestedStartDate.getMonth() + months);
        requestedEndDate.setDate(requestedStartDate.getDate() - 1);
      }
      
      // Set to start/end of day for accurate comparison
      requestedStartDate.setHours(0, 0, 0, 0);
      requestedEndDate.setHours(23, 59, 59, 999);
      
      // Edge case: Validate end date is not before start date
      if (requestedEndDate < requestedStartDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range. End date cannot be before start date.',
          code: 'INVALID_DATE_RANGE'
        });
      }
      
      // Edge case: Same day booking validation
      const isSameDay = requestedStartDate.toDateString() === requestedEndDate.toDateString();
      
      // Check for any booking that overlaps with the requested date range
      // Overlap condition: (StartA <= EndB) AND (EndA >= StartB)
      const seatOccupiedBy = await Booking.findOne({
        preferredSeat: bookingData.preferredSeat,
        membershipType: bookingData.membershipType,
        timeSlot: bookingData.timeSlot,
        $or: [
          { membershipActive: true, paymentStatus: { $in: ['completed', 'cash_collected'] } },
          { paymentStatus: 'cash_pending', isActive: true }
        ],
        // Date range overlap check
        membershipStartDate: { $lte: requestedEndDate },
        membershipEndDate: { $gte: requestedStartDate },
        isActive: true
      }).populate('userId', 'fullName email');

      if (seatOccupiedBy) {
        // Format dates for better error message
        const conflictStart = seatOccupiedBy.membershipStartDate.toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        const conflictEnd = seatOccupiedBy.membershipEndDate.toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        const requestedStartStr = requestedStartDate.toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        const requestedEndStr = requestedEndDate.toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        
        return res.status(409).json({
          success: false,
          message: `Seat ${bookingData.preferredSeat} is not available for the selected dates (${requestedStartStr} - ${requestedEndStr}). It is already booked from ${conflictStart} to ${conflictEnd} for ${seatOccupiedBy.timeSlot}.`,
          seatOccupiedBy: seatOccupiedBy.userId ? seatOccupiedBy.userId.fullName : 'Another member',
          existingBooking: {
            startDate: seatOccupiedBy.membershipStartDate,
            endDate: seatOccupiedBy.membershipEndDate,
            timeSlot: seatOccupiedBy.timeSlot
          },
          requestedBooking: {
            startDate: requestedStartDate,
            endDate: requestedEndDate,
            timeSlot: bookingData.timeSlot
          },
          isSameDay: isSameDay,
          code: 'SEAT_ALREADY_OCCUPIED'
        });
      }
    }

    // Calculate membership end date
    const startDate = new Date(bookingData.membershipStartDate);
    const endDate = new Date(startDate);
    
    // Add duration based on membershipDuration (reuse duration from above validation)
    if (duration.includes('Day')) {
      const days = parseInt(duration);
      endDate.setDate(startDate.getDate() + days);
    } else if (duration.includes('Month')) {
      const months = parseInt(duration);
      endDate.setMonth(startDate.getMonth() + months);
    }

    // Generate transaction ID
    const transactionId = `CASH_${Date.now()}_${user._id.toString().slice(-4)}`;

    // Get current IST time
    const istTime = getCurrentIST();

    // Create booking with cash_pending status
    const newBooking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: user.dyanpittId || null,
      timeSlot: bookingData.timeSlot,
      membershipType: bookingData.membershipType,
      membershipDuration: bookingData.membershipDuration,
      membershipStartDate: startDate,
      membershipEndDate: endDate,
      totalAmount: bookingData.totalAmount,
      paymentStatus: 'cash_pending',
      paymentMethod: 'cash',
      paymentId: transactionId,
      transactionId: transactionId,
      preferredSeat: bookingData.preferredSeat || '',
      notes: bookingData.notes || '',
      paymentDate: null, // Will be set when payment is collected
      paymentTime: null, // Will be set when payment is collected
      membershipActive: false, // Will be activated when payment is collected
      isActive: true,
      bookedAt: istTime, // IST booking time
      lastUpdated: istTime
    });
    
    await newBooking.save();

    // Update user's booking details for easy access
    user.bookingDetails = {
      id: newBooking._id,
      timeSlot: newBooking.timeSlot,
      membershipType: newBooking.membershipType,
      membershipDuration: newBooking.membershipDuration,
      membershipStartDate: newBooking.membershipStartDate,
      membershipEndDate: newBooking.membershipEndDate,
      totalAmount: newBooking.totalAmount,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
      paymentId: newBooking.paymentId,
      transactionId: newBooking.transactionId,
      bookedAt: newBooking.bookedAt,
      preferredSeat: newBooking.preferredSeat
    };
    
    // CRITICAL: Set bookingCompleted = true since user has completed the booking process
    user.bookingCompleted = true;
    
    await user.save();

    logger.info('💰 Cash booking created with pending status:', {
      bookingId: newBooking._id,
      user: user.email,
      transactionId: transactionId,
      amount: bookingData.totalAmount
    });

    res.json({
      success: true,
      message: 'Booking created successfully. Please visit our center to complete cash payment within 48 hours.',
      data: {
        bookingId: newBooking._id,
        transactionId: transactionId,
        paymentStatus: 'cash_pending',
        expiresAt: new Date(newBooking.bookedAt.getTime() + 48 * 60 * 60 * 1000), // 48 hours from booking time
        bookingDetails: {
          id: newBooking._id,
          timeSlot: newBooking.timeSlot,
          membershipType: newBooking.membershipType,
          membershipDuration: newBooking.membershipDuration,
          membershipStartDate: newBooking.membershipStartDate,
          membershipEndDate: newBooking.membershipEndDate,
          totalAmount: newBooking.totalAmount,
          paymentStatus: newBooking.paymentStatus,
          paymentMethod: newBooking.paymentMethod,
          paymentId: newBooking.paymentId,
          transactionId: newBooking.transactionId,
          bookedAt: newBooking.bookedAt,
          preferredSeat: newBooking.preferredSeat
        }
      }
    });

  } catch (error) {
    logger.error('Create cash booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
});

// REMOVED: Duplicate route moved above /:bookingId to fix route conflict

// Confirm cash payment collection (Admin only) - Update existing booking
router.post('/confirm-cash-payment', auth, async (req, res) => {
  try {
    const { bookingId, userId, adminNotes } = req.body;

    // Verify admin authorization
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || !adminUser.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find the pending booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.paymentStatus !== 'cash_pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not in pending status'
      });
    }

    // Get current IST time for payment confirmation
    const istConfirmationTime = getCurrentIST();

    // Get user details BEFORE updating booking
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // CRITICAL: Generate Dyanpitt ID for first-time users
    let dyanpittIdData = null;
    if (!user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        
        // Update booking with the new Dyanpitt ID
        booking.dyanpittId = dyanpittIdData.dyanpittId;
        
      } catch (error) {
        logger.error('❌ Failed to assign Dyanpitt ID for cash payment:', error);
      }
    }

    // Update the booking to collected status
    booking.paymentStatus = 'cash_collected';
    booking.paymentDate = istConfirmationTime;
    booking.paymentTime = istConfirmationTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    booking.membershipActive = true;
    booking.lastUpdated = istConfirmationTime;
    booking.confirmedBy = adminUser._id;
    booking.confirmedAt = istConfirmationTime;
    booking.notes = adminNotes;

    await booking.save();

    // Update user's booking details and payment completion
    if (user.bookingDetails) {
      user.bookingDetails.paymentStatus = 'cash_collected';
      user.bookingDetails.paymentDate = istConfirmationTime;
      user.bookingDetails.paymentTime = booking.paymentTime;
    }
    
    // Mark payment as completed for user
    user.paymentCompleted = true;
    await user.save();


    res.json({
      success: true,
      message: 'Cash payment confirmed successfully!',
      data: {
        bookingId: booking._id,
        transactionId: booking.transactionId,
        paymentStatus: booking.paymentStatus,
        paymentDate: booking.paymentDate,
        paymentTime: booking.paymentTime,
        confirmedBy: adminUser.email,
        confirmedAt: booking.confirmedAt,
        dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId || null,
        membershipActive: booking.membershipActive
      }
    });

  } catch (error) {
    logger.error('Error confirming cash payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm cash payment'
    });
  }
});

// Create Razorpay payment order
router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { amount, currency = 'INR', bookingData } = req.body;

    // Validate required fields
    if (!amount || !bookingData) {
      return res.status(400).json({
        success: false,
        message: 'Amount and booking data are required'
      });
    }

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // CRITICAL: First update any expired memberships before checking eligibility
    await Booking.updateExpiredMemberships();

    // Check if user already has an active membership
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      membershipActive: true,
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      membershipEndDate: { $gte: today }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership. Only one active membership is allowed at a time.',
        activeMembership: activeBookings[0]
      });
    }

    // CRITICAL: Check if preferred seat is already occupied (prevent double-booking)
    // Use date range overlap check instead of just checking today
    if (bookingData.preferredSeat) {
      // Calculate requested date range for seat overlap check
      const requestedStart = new Date(bookingData.membershipStartDate);
      const requestedEnd = new Date(bookingData.membershipStartDate);
      
      const bookingDuration = bookingData.membershipDuration;
      if (bookingDuration.includes('Day')) {
        const days = parseInt(bookingDuration);
        requestedEnd.setDate(requestedStart.getDate() + days - 1);
      } else if (bookingDuration.includes('Month')) {
        const months = parseInt(bookingDuration);
        requestedEnd.setMonth(requestedStart.getMonth() + months);
        requestedEnd.setDate(requestedStart.getDate() - 1);
      }
      
      requestedStart.setHours(0, 0, 0, 0);
      requestedEnd.setHours(23, 59, 59, 999);
      
      const seatOccupiedBy = await Booking.findOne({
        preferredSeat: bookingData.preferredSeat,
        membershipType: bookingData.membershipType,
        timeSlot: bookingData.timeSlot,
        $or: [
          { membershipActive: true, paymentStatus: { $in: ['completed', 'cash_collected'] } },
          { paymentStatus: 'cash_pending', isActive: true }
        ],
        // Date range overlap check: (StartA <= EndB) AND (EndA >= StartB)
        membershipStartDate: { $lte: requestedEnd },
        membershipEndDate: { $gte: requestedStart },
        isActive: true
      }).populate('userId', 'fullName email');

      if (seatOccupiedBy) {
        const conflictStart = seatOccupiedBy.membershipStartDate.toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        const conflictEnd = seatOccupiedBy.membershipEndDate.toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        
        return res.status(409).json({
          success: false,
          message: `Seat ${bookingData.preferredSeat} is not available for the selected dates. It is already booked from ${conflictStart} to ${conflictEnd} for ${seatOccupiedBy.timeSlot}.`,
          seatOccupiedBy: seatOccupiedBy.userId ? seatOccupiedBy.userId.fullName : 'Another member',
          existingBooking: {
            startDate: seatOccupiedBy.membershipStartDate,
            endDate: seatOccupiedBy.membershipEndDate,
            timeSlot: seatOccupiedBy.timeSlot
          },
          code: 'SEAT_ALREADY_OCCUPIED'
        });
      }
    }

    // Check if Razorpay is properly configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.',
        code: 'PAYMENT_GATEWAY_NOT_CONFIGURED'
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Amount in paise (smallest currency unit)
      currency: currency,
      receipt: `receipt_${Date.now()}_${user._id}`,
      notes: {
        userId: user._id.toString(),
        userEmail: user.email,
        membershipType: bookingData.membershipType,
        timeSlot: bookingData.timeSlot
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    logger.info('💳 Razorpay order created:', {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      user: user.email
    });

    res.json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Frontend needs this for payment
        bookingData: bookingData
      }
    });

  } catch (error) {
    logger.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify Razorpay payment and complete booking
router.post('/verify-razorpay-payment', auth, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingData 
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingData) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification data and booking data are required'
      });
    }

    // Check if Razorpay is properly configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Please contact administrator.',
        code: 'PAYMENT_GATEWAY_NOT_CONFIGURED'
      });
    }

    // Verify payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      logger.error('❌ Razorpay signature verification failed:', {
        expected: generatedSignature,
        received: razorpay_signature
      });
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Fetch payment details from Razorpay to get additional info
    let paymentDetails = null;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (paymentError) {
      logger.error('❌ Failed to fetch payment details:', paymentError);
      // Continue with verification even if fetching fails
    }

    logger.info('✅ Payment verification successful:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      method: paymentDetails?.method,
      status: paymentDetails?.status
    });

    // Now proceed with the same booking creation logic as complete-payment
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate missing fields if not provided
    if (!bookingData.totalAmount) {
      bookingData.totalAmount = paymentDetails?.amount ? paymentDetails.amount / 100 : 1000;
    }

    // Calculate membership end date if not provided
    if (!bookingData.membershipEndDate) {
      const startDate = new Date(bookingData.membershipStartDate);
      let endDate = new Date(startDate);
      
      const duration = bookingData.membershipDuration;
      if (duration.includes('Day')) {
        const days = parseInt(duration.match(/\d+/)[0]);
        endDate.setDate(startDate.getDate() + days - 1);
      } else if (duration.includes('Month')) {
        const months = parseInt(duration.match(/\d+/)[0]);
        endDate.setMonth(startDate.getMonth() + months);
        endDate.setDate(startDate.getDate() - 1);
      }
      
      bookingData.membershipEndDate = endDate;
    }

    // Assign Dyanpitt ID if this is the first membership
    let dyanpittIdData = null;
    if (!user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        user.dyanpittId = dyanpittIdData.dyanpittId;
        user.hasDnyanpittId = true;
      } catch (error) {
        logger.error('❌ Failed to assign Dyanpitt ID:', error);
      }
    }

    // Deactivate any existing active bookings for this user
    await Booking.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, lastUpdated: getCurrentIST() }
    );

    // Get current IST time
    const istTime = getCurrentIST();

    // Create the booking in database with verified payment information
    const newBooking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId || null,
      timeSlot: bookingData.timeSlot,
      membershipType: bookingData.membershipType,
      membershipDuration: bookingData.membershipDuration,
      membershipStartDate: new Date(bookingData.membershipStartDate),
      membershipEndDate: new Date(bookingData.membershipEndDate),
      totalAmount: bookingData.totalAmount,
      paymentStatus: 'completed',
      paymentMethod: 'razorpay_upi',
      paymentId: razorpay_payment_id,
      transactionId: razorpay_order_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      preferredSeat: bookingData.preferredSeat,
      notes: bookingData.notes || '',
      paymentDate: istTime,
      paymentTime: istTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }),
      membershipActive: true,
      isActive: true,
      bookedAt: istTime,
      lastUpdated: istTime
    });
    
    await newBooking.save();

    // Update user's booking and payment status
    user.bookingCompleted = true;
    user.paymentCompleted = true;
    user.hasDnyanpittId = dyanpittIdData ? true : user.hasDnyanpittId;
    user.dyanpittId = dyanpittIdData?.dyanpittId || user.dyanpittId;
    
    // Update user's booking details for frontend
    user.bookingDetails = {
      timeSlot: newBooking.timeSlot,
      membershipType: newBooking.membershipType,
      membershipDuration: newBooking.membershipDuration,
      membershipStartDate: newBooking.membershipStartDate,
      membershipEndDate: newBooking.membershipEndDate,
      totalAmount: newBooking.totalAmount,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
      paymentId: newBooking.paymentId,
      transactionId: newBooking.transactionId,
      membershipActive: newBooking.membershipActive,
      bookedAt: newBooking.bookedAt,
      paymentDate: newBooking.paymentDate,
      preferredSeat: newBooking.preferredSeat
    };
    
    await user.save();

    // Update Membership table with Dyanpitt ID if user has a membership
    if (dyanpittIdData?.dyanpittId) {
      const Membership = require('../models/Membership');
      try {
        await Membership.updateOne(
          { userId: user._id },
          { dyanpittId: dyanpittIdData.dyanpittId },
          { sort: { createdAt: -1 } }
        );
      } catch (membershipError) {
        logger.error('❌ Failed to update membership with Dyanpitt ID:', membershipError);
      }
    }

    const responseData = {
      id: newBooking._id,
      timeSlot: newBooking.timeSlot,
      membershipType: newBooking.membershipType,
      membershipDuration: newBooking.membershipDuration,
      membershipStartDate: newBooking.membershipStartDate,
      membershipEndDate: newBooking.membershipEndDate,
      totalAmount: newBooking.totalAmount,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
      paymentId: newBooking.paymentId,
      transactionId: newBooking.transactionId,
      membershipActive: newBooking.membershipActive,
      bookedAt: newBooking.bookedAt,
      paymentDate: newBooking.paymentDate
    };

    logger.info('🎉 Razorpay payment completed successfully:', {
      bookingId: newBooking._id,
      paymentId: razorpay_payment_id,
      user: user.email,
      amount: newBooking.totalAmount,
      dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId
    });

    res.json({
      success: true,
      message: 'Payment verified and booking created successfully',
      data: responseData,
      booking: responseData,
      dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId,
      transactionId: responseData.transactionId
    });

  } catch (error) {
    logger.error('❌ Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment and create booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/booking/test
// @desc    Test endpoint
// @access  Public
router.get('/test', (req, res) => {
  logger.info('🧪 Test endpoint called');
  res.json({ success: true, message: 'Booking routes working!' });
});

module.exports = router;