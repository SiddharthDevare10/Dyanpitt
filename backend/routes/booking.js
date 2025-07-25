const express = require('express');

const User = require('../models/User');
const Member = require('../models/Member');
const Booking = require('../models/Booking');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create or update booking details
router.post('/create', authenticateToken, async (req, res) => {
  try {
    console.log('Booking create request received:', {
      userId: req.user.userId,
      dyanpittId: req.user.dyanpittId,
      body: req.body
    });
    
    const {
      timeSlot,
      membershipType,
      membershipDuration,
      membershipStartDate,
      preferredSeat,
      totalAmount,
      feeBreakdown
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'timeSlot', 'membershipType', 'membershipDuration', 
      'membershipStartDate', 'preferredSeat', 'totalAmount'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Get user from database to check their status
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has completed member details using the Member model's findByUser method
    const member = await Member.findByUser(user);
    console.log('Member check:', {
      userId: req.user.userId,
      dyanpittId: req.user.dyanpittId,
      userHasDyanpittId: user.hasDnyanpittId,
      memberFound: !!member,
      memberCompleted: member?.isCompleted
    });
    
    if (!member || !member.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Please complete member details first'
      });
    }

    // Validate membership start date (within 30 days)
    const startDate = new Date(membershipStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const thirtyDaysFromToday = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    if (startDate < today || startDate > thirtyDaysFromToday) {
      return res.status(400).json({
        success: false,
        message: 'Membership start date must be within 30 days from today'
      });
    }

    // Calculate membership end date
    const membershipEndDate = new Date(startDate);
    if (membershipDuration === '1 Day') {
      membershipEndDate.setDate(membershipEndDate.getDate() + 1);
    } else if (membershipDuration === '8 Days') {
      membershipEndDate.setDate(membershipEndDate.getDate() + 8);
    } else if (membershipDuration === '15 Days') {
      membershipEndDate.setDate(membershipEndDate.getDate() + 15);
    } else if (membershipDuration.includes('Month')) {
      const months = parseInt(membershipDuration.split(' ')[0]);
      membershipEndDate.setMonth(membershipEndDate.getMonth() + months);
    }

    // Calculate fee breakdown if not provided
    let calculatedFeeBreakdown = feeBreakdown;
    if (!calculatedFeeBreakdown) {
      // Get user data for discount calculations
      const user = await User.findById(req.user.userId);
      const isFemale = user?.gender === 'female';
      const userRegistrationDate = user?.registrationDate;
      const lastPackageDate = user?.lastPackageDate;
      
      // Calculate seat tier
      const getSeatTier = (seatId) => {
        if (!seatId) return 'standard';
        const seatNum = parseInt(seatId.match(/\d+$/)?.[0] || '0');
        const sectionLetter = seatId.charAt(0);
        
        if (membershipType === 'Dyandhara Kaksh' || membershipType === 'Calista Garden') {
          if (seatNum === 5) return 'gold';
          if ([24, 25, 26, 27, 28, 29, 32, 33].includes(seatNum)) return 'silver';
          return 'standard';
        } else if (membershipType === 'Dyanpurn Kaksh') {
          if (sectionLetter === 'A' && [54, 55, 56].includes(seatNum)) return 'silver';
          if (sectionLetter === 'B' && [63, 64, 65].includes(seatNum)) return 'silver';
          if (sectionLetter === 'C' && seatNum === 69) return 'gold';
          return 'standard';
        }
        return 'standard';
      };
      
      const seatTier = getSeatTier(preferredSeat);
      
      // Calculate base price
      let basePrice = 0;
      if (membershipType === 'Calista Garden') {
        const months = parseInt(membershipDuration.split(' ')[0]) || 1;
        basePrice = 399 * months;
      } else {
        // You'll need to import your pricing logic here
        // For now, using a simplified calculation
        const pricingMap = {
          'Dyandhara Kaksh': {
            '1 Day': { 'Day Batch (7:00 AM - 10:00 PM)': 99, 'Night Batch (10:00 PM - 7:00 AM)': 79, '24 Hours Batch': 149 },
            '1 Month': { 'Day Batch (7:00 AM - 10:00 PM)': 999, 'Night Batch (10:00 PM - 7:00 AM)': 799, '24 Hours Batch': 1499 },
            '6 Months': { 'Day Batch (7:00 AM - 10:00 PM)': 5640, 'Night Batch (10:00 PM - 7:00 AM)': 4512, '24 Hours Batch': 8460 }
          },
          'Dyanpurn Kaksh': {
            '1 Day': { 'Day Batch (7:00 AM - 10:00 PM)': 199, 'Night Batch (10:00 PM - 7:00 AM)': 149, '24 Hours Batch': 299 },
            '1 Month': { 'Day Batch (7:00 AM - 10:00 PM)': 1999, 'Night Batch (10:00 PM - 7:00 AM)': 1399, '24 Hours Batch': 2999 }
          }
        };
        basePrice = pricingMap[membershipType]?.[membershipDuration]?.[timeSlot] || totalAmount;
      }
      
      // Calculate seat tier surcharge
      const seatTierSurcharge = seatTier === 'silver' ? Math.round(basePrice * 0.25) : 
                               seatTier === 'gold' ? Math.round(basePrice * 0.50) : 0;
      
      const priceWithSeat = basePrice + seatTierSurcharge;
      
      // Calculate discounts
      let femaleDiscount = 0;
      let durationDiscount = 0;
      let totalDiscountPercentage = 0;
      
      if (isFemale && membershipType === 'Calista Garden') {
        femaleDiscount = 10; // 10% for Calista Garden
      }
      
      // Add duration-based discounts for longer memberships
      if (membershipDuration.includes('Month')) {
        const months = parseInt(membershipDuration.split(' ')[0]);
        if (months >= 3 && months < 6) durationDiscount = 5;
        else if (months >= 6 && months < 9) durationDiscount = 6;
        else if (months >= 9 && months < 12) durationDiscount = 7;
        else if (months >= 12) durationDiscount = 15;
      }
      
      totalDiscountPercentage = femaleDiscount + durationDiscount;
      const totalDiscountAmount = Math.round(priceWithSeat * totalDiscountPercentage / 100);
      
      // Registration fee logic (simplified)
      const registrationFee = 0; // You can add your registration fee logic here
      
      const finalAmount = priceWithSeat - totalDiscountAmount + registrationFee;
      
      calculatedFeeBreakdown = {
        basePrice,
        seatTier,
        seatTierSurcharge,
        discounts: {
          femaleDiscount,
          durationDiscount,
          totalDiscountPercentage,
          totalDiscountAmount
        },
        registrationFee,
        finalAmount
      };
    }

    // Check if booking already exists - use email first, then email + dyanpittId
    let booking = await Booking.findOne({ 
      email: user.email
    });

    if (booking) {
      // Update existing booking
      booking.email = user.email;
      if (user.hasDnyanpittId && user.dyanpittId) {
        booking.dyanpittId = user.dyanpittId; // Update Dyanpitt ID if user has one
      }
      booking.timeSlot = timeSlot;
      booking.membershipType = membershipType;
      booking.membershipDuration = membershipDuration;
      booking.membershipStartDate = new Date(membershipStartDate);
      booking.membershipEndDate = membershipEndDate;
      booking.preferredSeat = preferredSeat;
      booking.totalAmount = totalAmount;
      booking.feeBreakdown = calculatedFeeBreakdown;
      booking.isCompleted = true;
      booking.paymentStatus = 'pending'; // Reset payment status for new booking
    } else {
      // Create new booking
      const bookingData = {
        email: user.email,
        timeSlot,
        membershipType,
        membershipDuration,
        membershipStartDate: new Date(membershipStartDate),
        membershipEndDate,
        preferredSeat,
        totalAmount,
        feeBreakdown: calculatedFeeBreakdown,
        isCompleted: true,
        paymentStatus: 'pending'
      };
      
      // Add Dyanpitt ID only if user has a real one
      if (user.hasDnyanpittId && user.dyanpittId) {
        bookingData.dyanpittId = user.dyanpittId;
      }
      
      booking = new Booking(bookingData);
    }

    await booking.save();

    // Update user's booking completion status
    await User.findByIdAndUpdate(req.user.userId, {
      bookingCompleted: true
    });

    res.json({
      success: true,
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get booking details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const booking = await Booking.findOne({ 
      email: user.email
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking details not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update payment status
router.post('/payment', authenticateToken, async (req, res) => {
  try {
    const { paymentId, paymentStatus } = req.body;

    if (!paymentId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and status are required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const booking = await Booking.findOne({ 
      email: user.email
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.paymentId = paymentId;
    booking.paymentStatus = paymentStatus;
    
    if (paymentStatus === 'completed') {
      booking.paymentDate = new Date();
      booking.bookingStatus = 'active';
    }

    await booking.save();

    let dyanpittIdData = null;

    // Generate Dnyanpitt ID if payment is successful and user doesn't have one
    if (paymentStatus === 'completed' && !user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        console.log('Dnyanpitt ID generated:', dyanpittIdData.dyanpittId);
        
        // Send welcome email with Dnyanpitt ID
        const emailService = require('../services/emailService');
        await emailService.sendWelcomeEmail(user.email, user.fullName, dyanpittIdData.dyanpittId);
        
        // Update any existing member records with the new Dnyanpitt ID
        const existingMember = await Member.findByUser(user);
        if (existingMember) {
          await existingMember.updateDyanpittIdReference(dyanpittIdData.dyanpittId);
        }
        
        // Update the booking with the new Dyanpitt ID
        if (dyanpittIdData.dyanpittId) {
          booking.dyanpittId = dyanpittIdData.dyanpittId;
          await booking.save();
        }
        
      } catch (error) {
        console.error('Error generating Dnyanpitt ID:', error);
        // Continue with payment completion even if ID generation fails
      }
    }

    // Update user's booking completion status
    await User.findByIdAndUpdate(req.user.userId, {
      bookingCompleted: true
    });

    const response = {
      success: true,
      message: paymentStatus === 'completed' && dyanpittIdData 
        ? 'Payment completed successfully! Your Dnyanpitt ID has been generated.' 
        : 'Payment status updated successfully',
      booking
    };

    // Include Dnyanpitt ID in response if generated
    if (dyanpittIdData) {
      response.dyanpittId = dyanpittIdData.dyanpittId;
      response.showCongratulations = true;
    }

    res.json(response);

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get booking status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const booking = await Booking.findOne({ 
      email: user.email
    });

    res.json({
      success: true,
      isCompleted: booking ? booking.isCompleted : false,
      hasBooking: !!booking,
      paymentStatus: booking ? booking.paymentStatus : null,
      bookingStatus: booking ? booking.bookingStatus : null
    });

  } catch (error) {
    console.error('Get booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all bookings (admin route)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('dyanpittId', 'fullName email dyanpittId phoneNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;