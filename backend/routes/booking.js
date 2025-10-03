const express = require('express');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { authenticateToken: auth } = require('../middleware/auth');
const { requireEmailVerification, requireProfileCompletion } = require('../middleware/emailVerification');

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
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
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
    console.error('Get booking error:', error);
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
    console.error('Get my bookings error:', error);
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

    // Get active bookings from separate Booking table
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBookings = await Booking.find({
      userId: user._id,
      isActive: true,
      membershipActive: true,
      membershipEndDate: { $gte: today }
    });

    res.json({
      success: true,
      data: activeBookings
    });

  } catch (error) {
    console.error('Get active bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active bookings'
    });
  }
});

// Check if user can create new membership
router.get('/check-eligibility', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
    console.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check membership eligibility'
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
    console.log('📦 Booking details validated, ready for payment');

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
    
    console.log('📤 Sending validated booking data for payment:', responseData);
    
    res.json({
      success: true,
      message: 'Booking details validated, proceed to payment',
      data: responseData,
      user: userProfile
    });

  } catch (error) {
    console.error('Validate booking error:', error);
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
    console.error('Update booking error:', error);
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

    // Deactivate any existing active bookings for this user
    await Booking.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, lastUpdated: new Date() }
    );

    // Determine payment status and membership activation based on payment method
    const finalPaymentStatus = paymentMethod === 'cash' ? 'cash_pending' : 'completed';
    const isMembershipActive = paymentMethod !== 'cash'; // Only activate for non-cash payments
    
    // Get current IST time
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const istTime = new Date(now.getTime() + istOffset);

    // Now create the booking in database with payment information
    const newBooking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: user.dyanpittId || null, // Include Dyanpeeth ID if available
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
      paymentTime: paymentMethod !== 'cash' ? istTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : null, // IST payment time
      membershipActive: isMembershipActive,
      isActive: true,
      bookedAt: istTime, // IST booking time
      lastUpdated: istTime
    });
    
    await newBooking.save();

    // Allocate seat automatically or use preferred seat
    const SeatAllocation = require('../models/SeatAllocation');
    let seatAllocation = null;
    
    try {
      // Try to allocate the preferred seat or auto-allocate
      seatAllocation = await SeatAllocation.allocateSeat(newBooking._id, bookingData.preferredSeat);
      console.log(`✅ Seat ${seatAllocation.seatNumber} allocated for booking ${newBooking._id}`);
    } catch (seatError) {
      console.error('⚠️ Seat allocation failed:', seatError.message);
      // Continue without failing the booking - seat can be allocated manually later
    }

    // Assign Dyanpitt ID if this is the first membership
    let dyanpittIdData = null;
    if (!user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        console.log('✅ Dyanpitt ID assigned:', dyanpittIdData.dyanpittId);
      } catch (error) {
        console.error('❌ Failed to assign Dyanpitt ID:', error);
      }
    }

    console.log('📦 Booking created after payment completion:', newBooking);

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

    res.json({
      success: true,
      message: 'Payment completed and booking created successfully',
      data: responseData,
      dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId
    });

  } catch (error) {
    console.error('Complete payment and create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment and create booking'
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2); // 2 days from now

    const cashPaymentRequest = {
      userId: user._id,
      userEmail: user.email,
      transactionId: transactionId,
      bookingData: bookingData,
      status: 'pending_admin_review',
      requestedAt: new Date(),
      expiresAt: expiresAt
    };

    // Store in user document temporarily (will be cleaned up after 2 days)
    user.pendingCashPaymentRequest = cashPaymentRequest;
    await user.save();

    console.log('💰 Cash payment request created:', {
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
    console.error('Create cash payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cash payment request'
    });
  }
});

// Admin route: Get all pending cash payment requests
router.get('/pending-cash-payments', auth, async (req, res) => {
  try {
    // Check if user making request is admin
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || !adminUser.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find all users with pending cash payment requests
    const usersWithPendingPayments = await User.find({
      'pendingCashPaymentRequest': { $ne: null },
      'pendingCashPaymentRequest.status': 'pending_admin_review'
    }).select('email fullName phoneNumber pendingCashPaymentRequest createdAt');

    // Filter out expired requests
    const now = new Date();
    const validPendingPayments = usersWithPendingPayments.filter(user => {
      const expiresAt = new Date(user.pendingCashPaymentRequest.expiresAt);
      return expiresAt > now;
    });

    // Format the response
    const pendingRequests = validPendingPayments.map(user => ({
      userId: user._id,
      userEmail: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      transactionId: user.pendingCashPaymentRequest.transactionId,
      bookingData: user.pendingCashPaymentRequest.bookingData,
      requestedAt: user.pendingCashPaymentRequest.requestedAt,
      expiresAt: user.pendingCashPaymentRequest.expiresAt,
      status: user.pendingCashPaymentRequest.status,
      timeRemaining: Math.ceil((new Date(user.pendingCashPaymentRequest.expiresAt) - now) / (1000 * 60 * 60)) // Hours remaining
    }));

    res.json({
      success: true,
      message: `Found ${pendingRequests.length} pending cash payment requests`,
      data: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    console.error('Get pending cash payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending cash payment requests'
    });
  }
});

// Admin route: Confirm cash payment and create booking
router.post('/confirm-cash-payment', auth, async (req, res) => {
  try {
    const { userEmail, transactionId, bookingData } = req.body;

    // Check if user making request is admin
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || !adminUser.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find the user with pending cash payment
    const user = await User.findOne({ email: userEmail });
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
        message: 'User already has an active membership.',
        activeMembership: activeBookings[0]
      });
    }

    // Deactivate any existing active bookings for this user
    await Booking.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, lastUpdated: new Date() }
    );

    // Get current IST time for payment confirmation
    const confirmationTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const istConfirmationTime = new Date(confirmationTime.getTime() + istOffset);

    // Create the booking with cash_collected status
    const newBooking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: user.dyanpittId || null, // Include Dyanpeeth ID if available
      timeSlot: bookingData.timeSlot,
      membershipType: bookingData.membershipType,
      membershipDuration: bookingData.membershipDuration,
      membershipStartDate: new Date(bookingData.membershipStartDate),
      membershipEndDate: new Date(bookingData.membershipEndDate),
      totalAmount: bookingData.totalAmount,
      paymentStatus: 'cash_collected',
      paymentMethod: 'cash',
      paymentId: transactionId,
      transactionId: transactionId,
      preferredSeat: bookingData.preferredSeat,
      notes: bookingData.notes || '',
      paymentDate: istConfirmationTime, // IST payment confirmation date
      paymentTime: istConfirmationTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }), // IST payment time
      membershipActive: true,
      isActive: true,
      bookedAt: new Date(), // Original booking time
      lastUpdated: istConfirmationTime,
      confirmedBy: adminUser._id,
      confirmedAt: istConfirmationTime
    });
    
    await newBooking.save();

    // Allocate seat automatically or use preferred seat
    const SeatAllocation = require('../models/SeatAllocation');
    let seatAllocation = null;
    
    try {
      // Try to allocate the preferred seat or auto-allocate
      seatAllocation = await SeatAllocation.allocateSeat(newBooking._id, bookingData.preferredSeat);
      console.log(`✅ Seat ${seatAllocation.seatNumber} allocated for cash payment booking ${newBooking._id}`);
    } catch (seatError) {
      console.error('⚠️ Seat allocation failed for cash payment:', seatError.message);
      // Continue without failing the booking - seat can be allocated manually later
    }

    // Assign Dyanpitt ID if this is the first membership
    let dyanpittIdData = null;
    if (!user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        console.log('✅ Dyanpitt ID assigned after cash payment:', dyanpittIdData.dyanpittId);
      } catch (error) {
        console.error('❌ Failed to assign Dyanpitt ID:', error);
      }
    }

    // Clear pending cash payment from user document
    user.pendingCashPaymentRequest = null;
    await user.save();

    console.log('📦 Booking created after cash payment confirmation:', newBooking);

    res.json({
      success: true,
      message: 'Cash payment confirmed and booking created successfully',
      data: {
        id: newBooking._id,
        user: user.getPublicProfile(),
        dyanpittId: dyanpittIdData?.dyanpittId || user.dyanpittId,
        booking: {
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
          paymentDate: newBooking.paymentDate,
          confirmedBy: newBooking.confirmedBy,
          confirmedAt: newBooking.confirmedAt
        }
      }
    });

  } catch (error) {
    console.error('Confirm cash payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm cash payment'
    });
  }
});

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
        lastUpdated: new Date()
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
    console.error('Update payment status error:', error);
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
    console.error('Cash payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cash payment request'
    });
  }
});

// Get pending cash payments (Admin only)
router.get('/admin/pending-cash-payments', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find users with pending cash payments in their bookings array
    const usersWithPendingPayments = await User.find({
      'bookings.paymentStatus': 'cash_pending',
      'bookings.isActive': true
    }).select('-password').sort({ 'bookings.cashPaymentRequest.requestDate': -1 });

    // Extract pending payment bookings with user info
    const pendingPayments = [];
    usersWithPendingPayments.forEach(user => {
      user.bookings.forEach(booking => {
        if (booking.paymentStatus === 'cash_pending' && booking.isActive) {
          pendingPayments.push({
            _id: booking._id,
            user: {
              _id: user._id,
              email: user.email,
              fullName: user.fullName,
              phoneNumber: user.phoneNumber,
              dyanpittId: user.dyanpittId
            },
            timeSlot: booking.timeSlot,
            membershipType: booking.membershipType,
            membershipDuration: booking.membershipDuration,
            totalAmount: booking.totalAmount,
            paymentStatus: booking.paymentStatus,
            cashPaymentRequest: booking.cashPaymentRequest,
            bookedAt: booking.bookedAt
          });
        }
      });
    });

    // Sort by request date
    pendingPayments.sort((a, b) => 
      new Date(b.cashPaymentRequest?.requestDate) - new Date(a.cashPaymentRequest?.requestDate)
    );

    res.json({
      success: true,
      data: pendingPayments
    });

  } catch (error) {
    console.error('Get pending cash payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending cash payments'
    });
  }
});

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
    console.error('Confirm cash payment error:', error);
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
    console.error('Get booking stats error:', error);
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
    console.error('Export booking error:', error);
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

    // Check if user already has an active membership or pending cash payment
    const existingBookings = await Booking.find({
      userId: user._id,
      $or: [
        { paymentStatus: { $in: ['completed', 'cash_collected'] }, membershipActive: true },
        { paymentStatus: 'cash_pending', isActive: true }
      ]
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active membership or pending payment.',
        existingBooking: existingBookings[0]
      });
    }

    // Calculate membership end date
    const startDate = new Date(bookingData.membershipStartDate);
    const endDate = new Date(startDate);
    
    // Add duration based on membershipDuration
    const duration = bookingData.membershipDuration;
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
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const istTime = new Date(now.getTime() + istOffset);

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
    await user.save();

    console.log('💰 Cash booking created with pending status:', {
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
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
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
    console.error('Create cash booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
    });
  }
});

// Get pending cash payments for admin
router.get('/pending-cash-payments', auth, async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Fetch all pending cash bookings
    const pendingBookings = await Booking.find({
      paymentStatus: 'cash_pending',
      isActive: true
    })
    .populate('userId', 'name email phone dyanpittId')
    .sort({ bookedAt: -1 });

    // Transform data to match the expected format
    const formattedBookings = pendingBookings.map(booking => ({
      userId: booking.userId._id,
      bookingId: booking._id,
      name: booking.userId.name,
      email: booking.userId.email,
      phone: booking.userId.phone,
      dyanpittId: booking.userId.dyanpittId,
      membershipType: booking.membershipType,
      membershipDuration: booking.membershipDuration,
      timeSlot: booking.timeSlot,
      totalAmount: booking.totalAmount,
      preferredSeat: booking.preferredSeat,
      transactionId: booking.transactionId,
      paymentId: booking.paymentId,
      bookedAt: booking.bookedAt,
      membershipStartDate: booking.membershipStartDate,
      membershipEndDate: booking.membershipEndDate,
      notes: booking.notes
    }));

    console.log(`📋 Retrieved ${pendingBookings.length} pending cash payments for admin`);

    res.json({
      success: true,
      pendingBookings: formattedBookings,
      count: formattedBookings.length
    });

  } catch (error) {
    console.error('Error fetching pending cash payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending cash payments'
    });
  }
});

// Confirm cash payment collection (Admin only) - Update existing booking
router.post('/confirm-cash-payment', auth, async (req, res) => {
  try {
    const { bookingId, userId, adminNotes } = req.body;

    // Verify admin authorization
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || adminUser.role !== 'admin') {
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
    const confirmationTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const istConfirmationTime = new Date(confirmationTime.getTime() + istOffset);

    // Update the booking to collected status
    booking.paymentStatus = 'cash_collected';
    booking.paymentDate = istConfirmationTime;
    booking.paymentTime = istConfirmationTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    booking.membershipActive = true;
    booking.lastUpdated = istConfirmationTime;
    booking.confirmedBy = adminUser._id;
    booking.confirmedAt = istConfirmationTime;
    booking.notes = adminNotes;

    await booking.save();

    // Update user's booking details
    const user = await User.findById(userId);
    if (user && user.bookingDetails) {
      user.bookingDetails.paymentStatus = 'cash_collected';
      user.bookingDetails.paymentDate = istConfirmationTime;
      user.bookingDetails.paymentTime = booking.paymentTime;
      await user.save();
    }

    console.log(`✅ Cash payment confirmed by admin ${adminUser.email} for booking ${bookingId}`);

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
        confirmedAt: booking.confirmedAt
      }
    });

  } catch (error) {
    console.error('Error confirming cash payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm cash payment'
    });
  }
});

module.exports = router;