const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken: auth } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   POST /api/auth/check-email
// @desc    Check if email exists
// @access  Public
router.post('/check-email', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    const exists = await User.emailExists(email);
    
    res.json({
      success: true,
      exists
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/check-phone
// @desc    Check if phone number exists
// @access  Public
router.post('/check-phone', [
  body('phoneNumber').matches(/^\+\d{10,15}$/)
], async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const exists = await User.phoneExists(phoneNumber);
    
    res.json({
      success: true,
      exists
    });
  } catch (error) {
    console.error('Check phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP for email verification
// @access  Public
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user already exists (both verified and unverified)
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'The email already exists'
      });
    }

    // Handle existing user or create new temp user
    let tempUser = existingUser;
    
    if (!tempUser) {
      // Create temporary user WITHOUT email and Dyanpitt ID to avoid wastage
      // We'll generate these only after successful registration completion
      tempUser = new User({
        email: `temp_${Date.now()}@temp.local`, // Temporary email to avoid conflicts
        dyanpittId: `temp_${Date.now()}`, // Temporary ID
        fullName: 'Temporary',
        phoneNumber: `temp_${Date.now()}`,
        dateOfBirth: new Date(),
        gender: 'other',
        password: 'temporary',
        registrationMonth: '000000', // Temporary month
        registrationNumber: 0, // Temporary number
        isEmailVerified: false,
        pendingEmail: email // Store the actual email separately
      });
    } else if (tempUser.isEmailVerified) {
      // This shouldn't happen due to the check above, but just in case
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email. Please sign in instead.'
      });
    }

    // Generate and save OTP
    const otp = tempUser.generateOTP();
    await tempUser.save();

    // Send OTP email to the pending email address
    const emailResult = await emailService.sendOTP(email, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    // Find temp user by pending email
    const tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: false });
    if (!tempUser) {
      return res.status(400).json({
        success: false,
        message: 'No pending verification found for this email'
      });
    }

    // Verify OTP
    if (!tempUser.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Clear OTP and mark as verified
    tempUser.clearOTP();
    tempUser.isEmailVerified = true;
    await tempUser.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Complete user registration
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('fullName').trim().isLength({ min: 2 }),
  body('phoneNumber').matches(/^\+\d{10,15}$/),
  body('dateOfBirth').isISO8601(),
  body('gender').isIn(['male', 'female', 'other', 'prefer-not-to-say']),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, fullName, phoneNumber, dateOfBirth, gender, password } = req.body;

    // Check if phone number already exists
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Find verified temp user by pending email
    const tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: true });
    if (!tempUser) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified. Please verify your email first.'
      });
    }

    // NOW generate the actual Dyanpitt ID and assign the real email
    const { dyanpittId, registrationMonth, registrationNumber } = await User.generateDyanpittId();

    // Update user with complete information including real email and Dyanpitt ID
    tempUser.email = email; // Now assign the real email
    tempUser.dyanpittId = dyanpittId; // Now assign the real Dyanpitt ID
    tempUser.fullName = fullName;
    tempUser.phoneNumber = phoneNumber;
    tempUser.dateOfBirth = new Date(dateOfBirth);
    tempUser.gender = gender;
    tempUser.password = password; // Will be hashed by pre-save middleware
    tempUser.registrationMonth = registrationMonth;
    tempUser.registrationNumber = registrationNumber;
    tempUser.pendingEmail = undefined; // Remove the pending email field
    
    await tempUser.save();

    // Send welcome email
    await emailService.sendWelcomeEmail(email, fullName, tempUser.dyanpittId);

    // Generate JWT token
    const token = jwt.sign(
      { userId: tempUser._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      token,
      user: {
        ...tempUser.getPublicProfile(),
        membershipCompleted: tempUser.membershipCompleted || false,
        bookingCompleted: tempUser.bookingCompleted || false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with email or Dyanpitt ID
// @access  Public
router.post('/login', [
  body('email').optional().isEmail().normalizeEmail(),
  body('dyanpittId').optional().matches(/^@DA\d{9}$/),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, dyanpittId, password, rememberMe } = req.body;
    const identifier = email || dyanpittId;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or Dyanpitt ID is required'
      });
    }

    // Find user by email or Dyanpitt ID
    const user = await User.findByEmailOrDyanpittId(identifier);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active and email verified
    if (!user.isActive || !user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account is not active or email not verified'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...user.getPublicProfile(),
        membershipCompleted: user.membershipCompleted || false,
        bookingCompleted: user.bookingCompleted || false
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        ...user.getPublicProfile(),
        membershipCompleted: user.membershipCompleted || false,
        bookingCompleted: user.bookingCompleted || false
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate and save OTP for password reset
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailResult = await emailService.sendPasswordResetOTP(email, otp, user.fullName);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset code'
      });
    }

    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/verify-reset-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-reset-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Verify OTP
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.json({
      success: true,
      message: 'Verification code verified successfully'
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
], async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Verify OTP one more time
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.clearOTP(); // Clear the OTP
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Update membership details
router.post('/update-membership', auth, async (req, res) => {
  try {
    const { membershipDetails } = req.body;
    
    // Validate required fields
    const requiredFields = ['visitedBefore', 'fatherName', 'parentContactNumber', 'educationalBackground', 'currentOccupation', 'currentAddress', 'jobTitle', 'examPreparation', 'examinationDate', 'studyRoomDuration'];
    
    for (const field of requiredFields) {
      if (!membershipDetails[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Update user with membership details
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        membershipDetails,
        membershipCompleted: true
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Membership details updated successfully',
      user
    });

  } catch (error) {
    console.error('Update membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating membership details'
    });
  }
});

// Update booking details
router.post('/update-booking', auth, async (req, res) => {
  try {
    const { bookingDetails } = req.body;
    
    // Validate required fields
    const requiredFields = ['timeSlot', 'membershipType', 'membershipDuration', 'membershipStartDate', 'preferredSeat'];
    
    // Valid duration options
    const validDurations = [
      '1 Day', '8 Days', '15 Days', 
      '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
      '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
    ];
    
    // Special validation for Calista Garden - only monthly durations allowed
    if (bookingDetails.membershipType === 'Calista Garden') {
      const monthlyDurations = [
        '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
        '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
      ];
      if (!monthlyDurations.includes(bookingDetails.membershipDuration)) {
        return res.status(400).json({
          success: false,
          message: 'Calista Garden membership only supports monthly durations'
        });
      }
      
      if (bookingDetails.timeSlot !== 'Calista Garden (7:00 AM - 7:00 PM)') {
        return res.status(400).json({
          success: false,
          message: 'Calista Garden only supports 7:00 AM - 7:00 PM time slot'
        });
      }
    }
    
    for (const field of requiredFields) {
      if (!bookingDetails[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Validate membership duration
    if (!validDurations.includes(bookingDetails.membershipDuration)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership duration'
      });
    }

    // Validate membership start date is within 30 days
    const startDate = new Date(bookingDetails.membershipStartDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    if (startDate < today || startDate > thirtyDaysFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Membership start date must be within 30 days from today'
      });
    }

    // Import pricing data from CSV structure
    const pricingData = {
      "1 Day": {
        "Dyandhara Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 79,
          "Day Batch (7:00 AM - 10:00 PM)": 99,
          "24 Hours Batch": 149
        },
        "Dyanpurn Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 149,
          "Day Batch (7:00 AM - 10:00 PM)": 199,
          "24 Hours Batch": 299
        }
      },
      "8 Days": {
        "Dyandhara Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 299,
          "Day Batch (7:00 AM - 10:00 PM)": 399,
          "24 Hours Batch": 599
        },
        "Dyanpurn Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 349,
          "Day Batch (7:00 AM - 10:00 PM)": 499,
          "24 Hours Batch": 699
        }
      },
      "15 Days": {
        "Dyandhara Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 599,
          "Day Batch (7:00 AM - 10:00 PM)": 699,
          "24 Hours Batch": 999
        },
        "Dyanpurn Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 849,
          "Day Batch (7:00 AM - 10:00 PM)": 1199,
          "24 Hours Batch": 1799
        }
      },
      "1 Month": {
        "Dyandhara Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 799,
          "Day Batch (7:00 AM - 10:00 PM)": 999,
          "24 Hours Batch": 1499
        },
        "Dyanpurn Kaksh": {
          "Night Batch (10:00 PM - 7:00 AM)": 1399,
          "Day Batch (7:00 AM - 10:00 PM)": 1999,
          "24 Hours Batch": 2999
        }
      }
      // Add more months as needed
    };

    const durationMultipliers = {
      // Daily options
      '1 Day': 0.05,
      '8 Days': 0.35,
      '12 Days': 0.5,
      
      // Monthly options
      '1 Month': 1,
      '2 Months': 2,
      '3 Months': 2.85,    // 5% discount
      '4 Months': 4,
      '5 Months': 5,
      '6 Months': 5.64,    // 6% discount
      '7 Months': 7,
      '8 Months': 8,
      '9 Months': 8.37,    // 7% discount
      '10 Months': 9.2,    // 8% discount
      '11 Months': 9.9,    // 10% discount
      '12 Months': 10.2    // 15% discount
    };

    // Calculate total amount
    let totalAmount = 0;
    
    if (bookingDetails.membershipType === 'Calista Garden') {
      // Special pricing for Calista Garden - Rs.399 per month
      const monthsMap = {
        '1 Month': 1, '2 Months': 2, '3 Months': 3, '4 Months': 4,
        '5 Months': 5, '6 Months': 6, '7 Months': 7, '8 Months': 8,
        '9 Months': 9, '10 Months': 10, '11 Months': 11, '12 Months': 12
      };
      const months = monthsMap[bookingDetails.membershipDuration] || 1;
      totalAmount = 399 * months;
    } else {
      // Use CSV pricing data for other memberships
      totalAmount = pricingData[bookingDetails.membershipDuration]?.[bookingDetails.membershipType]?.[bookingDetails.timeSlot] || 0;
    }

    // Calculate membership end date
    const membershipEndDate = new Date(startDate);
    const duration = bookingDetails.membershipDuration;
    
    if (duration.includes('Day')) {
      const days = parseInt(duration.split(' ')[0]);
      membershipEndDate.setDate(membershipEndDate.getDate() + days);
    } else if (duration.includes('Month')) {
      const months = parseInt(duration.split(' ')[0]);
      membershipEndDate.setMonth(membershipEndDate.getMonth() + months);
    }

    // Update user with booking details
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        bookingDetails: {
          ...bookingDetails,
          membershipEndDate,
          totalAmount,
          paymentStatus: 'pending'
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking details updated successfully',
      user,
      paymentAmount: totalAmount
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking details'
    });
  }
});

// Complete payment
router.post('/complete-payment', auth, async (req, res) => {
  try {
    const { paymentId, paymentStatus } = req.body;
    
    if (!paymentId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and status are required'
      });
    }

    // Update user with payment completion
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        'bookingDetails.paymentId': paymentId,
        'bookingDetails.paymentStatus': paymentStatus,
        bookingCompleted: paymentStatus === 'completed'
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment completed successfully',
      user
    });

  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing payment'
    });
  }
});

module.exports = router;