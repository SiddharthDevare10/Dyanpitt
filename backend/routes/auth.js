const logger = require('../utils/logger');
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken: auth } = require('../middleware/auth');
const { requireEmailVerification, requireProfileCompletion } = require('../middleware/emailVerification');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const emailService = require('../services/emailService');
const verificationService = require('../services/verificationService');
const { uploadWithProcessing } = require('../middleware/upload');
const cleanupService = require('../services/cleanupService');
const TourLinkingService = require('../services/tourLinkingService');
const phoneVerificationService = require('../services/phoneVerificationService');

const router = express.Router();

// Rate limiters with custom keys (IP + identifier)
const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => `${req.ip}|${(req.body && req.body.email) || ''}`
});

const forgotLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => `${req.ip}|${(req.body && req.body.email) || ''}`
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => {
    const id = (req.body && (req.body.email || req.body.dyanpittId)) || 'unknown';
    return `${req.ip}|${id}`;
  }
});

function deleteUploadedFile(file) {
  if (!file) return;
  try {
    const filePath = file.path || path.join(__dirname, '..', 'uploads', file.filename);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.error('Failed to delete uploaded file:', err.message);
  }
}

// @route   POST /api/auth/check-email
// @desc    Check if email exists
// @access  Public
router.post('/check-email', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
], async (req, res) => {
  try {
    const { email } = req.body;
    const exists = await User.emailExists(email);
    
    res.json({
      success: true,
      exists
    });
  } catch (error) {
    logger.error('Check email error:', error);
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
  body('phoneNumber').matches(/^\+91[6-9]\d{9}$/).withMessage('Phone number must be in +91 format with valid Indian mobile number')
], async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const exists = await User.phoneExists(phoneNumber);
    
    res.json({
      success: true,
      exists
    });
  } catch (error) {
    logger.error('Check phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/send-phone-otp
// @desc    Send OTP for phone verification
// @access  Public
router.post('/send-phone-otp', otpLimiter, [
  body('phoneNumber').matches(/^\+91[6-9]\d{9}$/).withMessage('Phone number must be in +91 format with valid Indian mobile number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        errors: errors.array()
      });
    }

    const { phoneNumber } = req.body;

    // Check if phone number already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser && existingUser.isEmailVerified && existingUser.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered with another account'
      });
    }

    // Send OTP using phone verification service
    const result = await phoneVerificationService.sendOTP(phoneNumber);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn
    });

  } catch (error) {
    logger.error('Send phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending phone OTP'
    });
  }
});

// @route   POST /api/auth/verify-phone-otp
// @desc    Verify phone OTP
// @access  Public
router.post('/verify-phone-otp', [
  body('phoneNumber').matches(/^\+91[6-9]\d{9}$/).withMessage('Phone number must be in +91 format'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits')
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

    const { phoneNumber, otp } = req.body;

    // Verify OTP using phone verification service
    const isValid = phoneVerificationService.verifyOTP(phoneNumber, otp);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    res.json({
      success: true,
      message: 'Phone number verified successfully'
    });

  } catch (error) {
    logger.error('Verify phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during phone verification'
    });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP for email verification
// @access  Public
router.post('/send-otp', otpLimiter, [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
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

    // Check if user already exists with verified email
    const existingVerifiedUser = await User.findOne({ email, isEmailVerified: true });
    if (existingVerifiedUser) {
      return res.status(400).json({
        success: false,
        message: 'The email already exists'
      });
    }

    // Check for existing unverified user with this pending email
    let tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: false });
    
    // Also check for previously verified but not completed profile users (cleanup may have removed them)
    let expiredVerifiedUser = await User.findOne({ pendingEmail: email, isEmailVerified: true });
    
    if (!tempUser) {
      // If there's an expired verified user, remove it first to allow fresh registration
      if (expiredVerifiedUser) {
        await expiredVerifiedUser.deleteOne();
      }
      
      // Create temporary user WITHOUT email and Dyanpitt ID to avoid wastage
      // We'll generate these only after successful registration completion
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      tempUser = new User({
        email: `temp_${timestamp}_${randomSuffix}@temp.local`, // Unique temporary email
        dyanpittId: `temp_${timestamp}_${randomSuffix}`, // Unique temporary ID
        fullName: 'Temporary',
        phoneNumber: `temp_${timestamp}_${randomSuffix}`,
        dateOfBirth: new Date(),
        gender: 'other',
        currentAddress: 'Temporary Address', // Temporary address
        password: 'temporary',
        registrationMonth: '000000', // Temporary month
        registrationNumber: 0, // Temporary number
        isEmailVerified: false,
        pendingEmail: email // Store the actual email separately
      });
    }

    // Save temp user first
    await tempUser.save();

    // Schedule cleanup for this temporary user (35 minutes from now)
    await tempUser.scheduleCleanup();

    // Generate and send OTP using verification service
    const emailResult = await verificationService.sendOTPEmail(email);
    
    if (!emailResult.success) {
      logger.error('Email sending failed:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: emailResult.userMessage || emailResult.error || 'Failed to send OTP email',
        code: 'EMAIL_SEND_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email'
    });

  } catch (error) {
    logger.error('Send OTP error:', error);
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
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input - ' + errors.array().map(e => e.msg).join(', '),
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    // Verify OTP using verification service FIRST
    const otpVerification = verificationService.verifyOTP(email, otp);
    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
        errorType: otpVerification.errorType
      });
    }

    
    // Find temp user by pending email and mark as verified
    let tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: false });
    
    // RECOVERY MECHANISM: If temp user not found, check if there's already a verified user
    // or create a new temp user if OTP was valid but user was somehow lost
    if (!tempUser) {
      
      // Check if there's already a verified temp user for this email
      const existingVerifiedUser = await User.findOne({ pendingEmail: email, isEmailVerified: true });
      
      if (existingVerifiedUser) {
        // User already verified, just return success
        return res.json({
          success: true,
          message: 'Email verified successfully'
        });
      }
      
      // Create a new temp user since OTP was valid but user record is missing
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      
      tempUser = new User({
        email: `temp_recovery_${timestamp}_${randomSuffix}@temp.local`,
        dyanpittId: `temp_recovery_${timestamp}_${randomSuffix}`,
        fullName: 'Temporary Recovery',
        phoneNumber: `temp_recovery_${timestamp}_${randomSuffix}`,
        dateOfBirth: new Date(),
        gender: 'other',
        password: 'temporary',
        registrationMonth: '000000',
        registrationNumber: 0,
        isEmailVerified: false,
        pendingEmail: email
      });
      
      await tempUser.save();
      logger.info('Created recovery temp user for email:', email);
    }

    // Mark as verified and extend cleanup time for profile completion
    tempUser.isEmailVerified = true;
    
    // Generate persistent verification token for profile completion (1 hour grace period)
    tempUser.generateEmailVerificationToken();
    
    await tempUser.save();
    
    // Extend cleanup time to 2 hours after email verification (industry standard)
    await tempUser.scheduleCleanup(120); // 2 hours

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Complete user registration
// @access  Public
router.post('/register', uploadWithProcessing('avatar', { 
  createThumbnails: true, 
  maxWidth: 800, 
  maxHeight: 800, 
  quality: 85 
}), [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('fullName').trim().isLength({ min: 2 }),
  body('phoneNumber').matches(/^\+91[6-9]\d{9}$/).withMessage('Phone number must be in +91 format with valid Indian mobile number'),
  body('dateOfBirth').isISO8601(),
  body('gender').isIn(['male', 'female', 'other', 'prefer-not-to-say']),
  body('password').isLength({ min: 6 })
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

    const { email, fullName, phoneNumber, dateOfBirth, gender, currentAddress, password } = req.body;

    // Handle uploaded avatar (processed upload)
    let avatarUrl = null;
    let thumbnailUrl = null;

    // Check if phone number already exists
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      // No need to delete files as they're processed and saved automatically
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Note: Phone verification is optional for now
    // Can be enabled later when frontend implements phone verification flow
    // if (!phoneVerificationService.hasValidOTP(phoneNumber)) {
    //   deleteUploadedFile(req.file);
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Please verify your phone number first',
    //     code: 'PHONE_VERIFICATION_REQUIRED'
    //   });
    // }

    // Find verified temp user by pending email
    let tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: true });
    
    // VERIFICATION RECOVERY: If temp user not found, check if email was recently verified
    if (!tempUser) {
      
      // First, check if there's a user with valid persistent verification token
      const tokenVerifiedUser = await User.findOne({ 
        pendingEmail: email, 
        emailVerificationToken: { $exists: true, $ne: null },
        emailVerificationExpiry: { $gt: new Date() }
      });
      
      if (tokenVerifiedUser) {
        tempUser = tokenVerifiedUser;
      } else {
        // Check if there's an unverified temp user that we can recover
        const unverifiedTempUser = await User.findOne({ pendingEmail: email, isEmailVerified: false });
        
        // Check if OTP verification service still has valid verification for this email
        const hasValidOTP = verificationService.hasOTP && verificationService.hasOTP(email);
        
        if (unverifiedTempUser && hasValidOTP) {
          // Mark as verified and use this user
          unverifiedTempUser.isEmailVerified = true;
          unverifiedTempUser.generateEmailVerificationToken();
          await unverifiedTempUser.save();
          tempUser = unverifiedTempUser;
        } else {
          // Create a new verified temp user if verification service confirms email was verified
          const recoveryTimestamp = Date.now();
          const recoverySuffix = Math.random().toString(36).substring(2, 8);
          tempUser = new User({
            email: `temp_recovery_${recoveryTimestamp}_${recoverySuffix}@temp.local`,
            dyanpittId: `temp_recovery_${recoveryTimestamp}_${recoverySuffix}`,
            fullName: 'Temporary Recovery',
            phoneNumber: `temp_recovery_${recoveryTimestamp}_${recoverySuffix}`,
            dateOfBirth: new Date(),
            gender: 'other',
            password: 'temporary',
            registrationMonth: '000000',
            registrationNumber: 0,
            isEmailVerified: true,
            pendingEmail: email
          });
          tempUser.generateEmailVerificationToken();
          await tempUser.save();
        }
      }
    }
    
    // Check for phone number conflicts before proceeding
    const phoneUser = await User.findOne({ phoneNumber });
    if (phoneUser && phoneUser.pendingEmail !== email) {
      // If phone belongs to a different user
      if (phoneUser.isEmailVerified && phoneUser.profileCompleted) {
        deleteUploadedFile(req.file);
        return res.status(400).json({
          success: false,
          message: 'Phone number is already in use by another account'
        });
      } else {
        // If phone belongs to incomplete/unverified user, clean it up
        await User.deleteOne({ _id: phoneUser._id });
      }
    }

    // Debug logging (development only)
    
    if (!tempUser) {
      // Enhanced error message with recovery instructions
      deleteUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: 'Email verification expired or not found. Please verify your email again.',
        code: 'EMAIL_VERIFICATION_EXPIRED',
        instructions: 'Go back to the registration page and request a new verification code.'
      });
    }

    // If avatar is uploaded and processed, use the processed URLs
    if (req.processedFile) {
      avatarUrl = req.processedFile.main.url;
      thumbnailUrl = req.processedFile.thumbnail?.url;
      
    }

    // Update user with complete information (NO Dyanpitt ID generation yet)
    tempUser.email = email; // Now assign the real email
    tempUser.fullName = fullName;
    tempUser.phoneNumber = phoneNumber;
    tempUser.dateOfBirth = new Date(dateOfBirth);
    tempUser.gender = gender;
    tempUser.currentAddress = currentAddress;
    tempUser.password = password; // Will be hashed by pre-save middleware
    tempUser.pendingEmail = undefined; // Remove the pending email field
    tempUser.profileCompleted = true; // Mark profile as completed since all basic info is provided
    tempUser.hasDnyanpittId = false; // User doesn't have Dyanpitt ID yet
    tempUser.isPhoneVerified = false; // Phone verification is optional for now
    // Don't set dyanpittId, registrationMonth, registrationNumber - they're optional now
    if (avatarUrl) {
      tempUser.avatar = avatarUrl; // Store avatar URL in database
      if (thumbnailUrl) {
        tempUser.avatarThumbnail = thumbnailUrl; // Store thumbnail URL
      }
    }
    
    // Cancel cleanup since registration is now complete
    await tempUser.cancelCleanup();
    
    // Clear email verification token since registration is complete
    tempUser.emailVerificationToken = null;
    tempUser.emailVerificationExpiry = null;
    
    await tempUser.save();

    // Link any existing tour requests to this user
    try {
      const linkingResult = await TourLinkingService.linkTourRequestsToUser(email, tempUser._id);
      if (linkingResult.success && linkingResult.linkedCount > 0) {
        // Linked successfully
      }
    } catch (linkingError) {
      logger.error('Error linking tour requests during registration:', linkingError);
      // Don't fail registration if linking fails
    }

    // Send intermediate welcome email (without Dyanpitt ID)
    try {
      await emailService.sendRegistrationCompleteEmail(email, fullName);
    } catch (emailError) {
      logger.error('Email sending failed, but continuing with registration:', emailError);
      // Don't fail registration if email fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: tempUser._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' } // Industry standard: 15 minutes
    );

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully. Complete your membership to get your Dyanpitt ID.',
      token,
      user: {
        ...tempUser.getPublicProfile(),
        membershipCompleted: tempUser.membershipCompleted || false,
        bookingCompleted: tempUser.bookingCompleted || false
      }
    });

  } catch (error) {
    deleteUploadedFile(req.file);
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with email or Dyanpitt ID
// @access  Public
router.post('/login', loginLimiter, [
  body('email').optional().isEmail().normalizeEmail({ gmail_remove_dots: false }),
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

    const { email, dyanpittId, password } = req.body;
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

    // SECURITY: Ensure user has completed full registration
    if (!user.email || user.email.includes('@temp.local') ||
        user.password === 'temporary' || user.pendingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your registration first'
      });
    }
    
    // Note: Users can login without Dyanpitt ID (will get it after first membership payment)

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Allow users with pending cash payments to login - they'll be redirected to cash payment pending screen

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token - session duration should be consistent regardless of remember me
    const expiresIn = '15m'; // Industry standard: 15 minutes for security
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn }
    );

    // Fetch user's bookings from separate Booking table
    const userBookings = await user.getBookings();

    res.json({
      success: true,
      message: user.hasDnyanpittId ? 'Login successful' : 'Login successful. Complete your membership to get your Dyanpitt ID.',
      token,
      user: {
        ...user.getPublicProfile(),
        membershipCompleted: user.membershipCompleted || false,
        bookingCompleted: user.bookingCompleted || false,
        bookings: userBookings // Fetched using User.getBookings() method
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fetch user's bookings from separate Booking table
    const userBookings = await user.getBookings();

    res.json({
      success: true,
      user: {
        ...user.getPublicProfile(),
        membershipCompleted: user.membershipCompleted || false,
        bookingCompleted: user.bookingCompleted || false,
        bookings: userBookings // Fetched using User.getBookings() method
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', forgotLimiter, [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
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

    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate and send OTP for password reset using verification service
    const emailResult = await verificationService.sendPasswordResetOTP(email, user.fullName);
    
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
    logger.error('Forgot password error:', error);
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
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
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

    // Verify OTP using verification service
    const otpVerification = verificationService.verifyOTP(email, otp);
    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
        errorType: otpVerification.errorType
      });
    }

    res.json({
      success: true,
      message: 'Verification code verified successfully'
    });
  } catch (error) {
    logger.error('Verify reset OTP error:', error);
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
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
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
    
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Note: OTP should have already been verified in verify-reset-otp endpoint
    // We'll verify it one more time for security, but won't delete it if it fails
    const otpVerification = verificationService.verifyOTP(email, otp);
    
    // Debug: Check what OTPs are stored
    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
        errorType: otpVerification.errorType
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();
    
    // Clear the OTP from verification service after successful password reset
    verificationService.clearOTP(email);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
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
router.post('/update-membership', auth, requireEmailVerification, requireProfileCompletion, uploadWithProcessing('selfiePhoto', { 
  createThumbnails: true, 
  maxWidth: 600, 
  maxHeight: 600, 
  quality: 90 
}), async (req, res) => {
  try {
    const membershipDetails = req.body;
    
    // Handle uploaded selfie photo
    if (req.processedFile) {
      membershipDetails.selfiePhotoUrl = req.processedFile.main.url;
      membershipDetails.selfiePhotoThumbnail = req.processedFile.thumbnail?.url;
      
    }
    
    // Validate required fields
    const requiredFields = ['visitedBefore', 'fatherName', 'parentContactNumber', 'educationalBackground', 'currentOccupation', 'examPreparation', 'examinationDate'];
    
    for (const field of requiredFields) {
      if (!membershipDetails[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }
    
    // Validate selfie photo upload
    if (!membershipDetails.selfiePhotoUrl && !req.processedFile) {
      return res.status(400).json({
        success: false,
        message: 'Selfie photo is required'
      });
    }
    
    // Job title is only required if not unemployed or student
    if (!membershipDetails.jobTitle && 
        membershipDetails.currentOccupation !== 'Unemployed' && 
        membershipDetails.currentOccupation !== 'Student') {
      return res.status(400).json({
        success: false,
        message: 'Job title is required'
      });
    }

    // Get user details first
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create membership entry in separate Membership table
    const Membership = require('../models/Membership');
    
    // Check if membership already exists for this user
    let membership = await Membership.findOne({ userId: user._id });
    
    if (membership) {
      // Update existing membership
      Object.assign(membership, membershipDetails);
      membership.submittedAt = new Date();
      await membership.save();
    } else {
      // Create new membership
      membership = new Membership({
        userId: user._id,
        userEmail: user.email,
        dyanpittId: user.dyanpittId || null, // Include Dyanpeeth ID if available
        ...membershipDetails,
        submittedAt: new Date()
      });
      await membership.save();
    }

    // Update user completion status only
    user.membershipCompleted = true;
    await user.save();

    // Get updated user data
    const updatedUser = await User.findById(req.user.userId).select('-password');

    res.json({
      success: true,
      message: 'Membership details updated successfully',
      user: updatedUser,
      membership: membership
    });

  } catch (error) {
    logger.error('Update membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating membership details'
    });
  }
});

// Update booking details - now saves to separate Booking table
router.post('/update-booking', auth, requireEmailVerification, requireProfileCompletion, async (req, res) => {
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

    // Validate membership start date is within 7 days
    const startDate = new Date(bookingDetails.membershipStartDate);
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    if (startDate < today || startDate > sevenDaysFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Membership start date must be within 7 days'
      });
    }

    // Import pricing data (shared with frontend)
    const { pricingData } = require('../data/pricing.js');

    // const durationMultipliers = {
      // // Daily options
      // '1 Day': 0.05,
      // '8 Days': 0.35,
      // '12 Days': 0.5,
      // 
      // // Monthly options
      // '1 Month': 1,
      // '2 Months': 2,
      // '3 Months': 2.85,    // 5% discount
      // '4 Months': 4,
      // '5 Months': 5,
      // '6 Months': 5.64,    // 6% discount
      // '7 Months': 7,
      // '8 Months': 8,
      // '9 Months': 8.37,    // 7% discount
      // '10 Months': 9.2,    // 8% discount
      // '11 Months': 9.9,    // 10% discount
      // '12 Months': 10.2    // 15% discount
    // };

    // Calculate total amount
    let totalAmount = 0;
    
    // Use CSV pricing data for memberships
    totalAmount = pricingData[bookingDetails.membershipDuration]?.[bookingDetails.membershipType]?.[bookingDetails.timeSlot] || 0;

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

    // Get user details first
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create booking entry in separate Booking table
    const Booking = require('../models/Booking');
    
    // Deactivate any existing active bookings for this user
    await Booking.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, lastUpdated: new Date() }
    );
    
    // Create new booking
    const newBooking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: user.dyanpittId || null, // Include Dyanpeeth ID if available
      ...bookingDetails,
      membershipEndDate,
      totalAmount,
      paymentStatus: 'pending',
      bookedAt: new Date(),
      lastUpdated: new Date()
    });
    
    await newBooking.save();

    // Note: Seat allocation will be handled manually by admin
    let seatAllocation = null;

    // Update user completion status only
    user.bookingCompleted = true;
    await user.save();

    // Get updated user data
    const updatedUser = await User.findById(req.user.userId).select('-password');

    res.json({
      success: true,
      message: 'Booking details updated successfully',
      user: updatedUser,
      booking: {
        id: newBooking._id,
        timeSlot: newBooking.timeSlot,
        membershipType: newBooking.membershipType,
        membershipDuration: newBooking.membershipDuration,
        membershipStartDate: newBooking.membershipStartDate,
        membershipEndDate: newBooking.membershipEndDate,
        totalAmount: newBooking.totalAmount,
        paymentStatus: newBooking.paymentStatus,
        membershipActive: newBooking.membershipActive,
        bookedAt: newBooking.bookedAt
      },
      seatAllocation: seatAllocation ? {
        seatNumber: seatAllocation.seatNumber,
        allocationId: seatAllocation._id,
        status: seatAllocation.allocationStatus,
        allocated: true
      } : {
        allocated: false,
        message: 'Seat allocation pending - you can select a seat manually'
      },
      paymentAmount: totalAmount
    });

  } catch (error) {
    logger.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating booking details'
    });
  }
});

// Renew membership (extends existing membership)
router.post('/renew-membership', auth, requireEmailVerification, requireProfileCompletion, async (req, res) => {
  try {
    const { bookingDetails } = req.body;
    
    // Validate required fields for renewal
    const requiredFields = ['timeSlot', 'membershipType', 'membershipDuration', 'membershipStartDate'];
    
    // Valid duration options
    const validDurations = [
      '1 Day', '8 Days', '15 Days', 
      '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
      '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
    ];
    
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

    // Get user first
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has completed membership before
    if (!user.membershipCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your initial membership first'
      });
    }

    // For renewal, use the current membership end date as the start date if it's in the future
    // Otherwise use the provided start date
    let effectiveStartDate = new Date(bookingDetails.membershipStartDate);
    
    if (user.bookingDetails && user.bookingDetails.membershipEndDate) {
      const currentEndDate = new Date(user.bookingDetails.membershipEndDate);
      const today = new Date();
      
      // If current membership is still active, start renewal from end date
      if (currentEndDate > today) {
        effectiveStartDate = currentEndDate;
      }
    }

    // Validate that start date is reasonable (not more than 1 year in the future)
    const today = new Date();
    const oneYearFromNow = new Date(today.getTime() + (365 * 24 * 60 * 60 * 1000));
    
    if (effectiveStartDate > oneYearFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Membership start date cannot be more than 1 year in the future'
      });
    }

    // Import pricing data
    const { pricingData } = require('../data/pricing.js');
    
    // Calculate total amount
    const totalAmount = pricingData[bookingDetails.membershipDuration]?.[bookingDetails.membershipType]?.[bookingDetails.timeSlot] || 0;

    // Calculate new membership end date
    const membershipEndDate = new Date(effectiveStartDate);
    const duration = bookingDetails.membershipDuration;
    
    if (duration.includes('Day')) {
      const days = parseInt(duration.split(' ')[0]);
      membershipEndDate.setDate(membershipEndDate.getDate() + days);
    } else if (duration.includes('Month')) {
      const months = parseInt(duration.split(' ')[0]);
      membershipEndDate.setMonth(membershipEndDate.getMonth() + months);
    }

    // Update user with new booking details (renewal)
    user.bookingDetails = {
      ...user.bookingDetails, // Keep existing details like preferredSeat if not provided
      ...bookingDetails,
      membershipStartDate: effectiveStartDate,
      membershipEndDate,
      totalAmount,
      paymentStatus: 'pending',
      paymentId: null, // Reset payment info for new payment
      paymentDate: null
    };

    // Reset booking completion status since new payment is required
    user.bookingCompleted = false;

    await user.save();

    res.json({
      success: true,
      message: 'Membership renewal initiated successfully',
      user: user.getPublicProfile(),
      paymentAmount: totalAmount,
      renewalInfo: {
        previousEndDate: user.bookingDetails.membershipEndDate,
        newStartDate: effectiveStartDate,
        newEndDate: membershipEndDate,
        isExtension: effectiveStartDate > today
      }
    });

  } catch (error) {
    logger.error('Renew membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing membership renewal'
    });
  }
});

// Create cash payment request
router.post('/create-cash-payment-request', auth, requireEmailVerification, requireProfileCompletion, async (req, res) => {
  try {
    // Get user first
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if membership is completed (required for payment)
    if (!user.membershipCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Membership must be completed before payment'
      });
    }

    // Check if user already has a pending cash payment request
    if (user.bookingDetails && user.bookingDetails.paymentStatus === 'cash_pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending cash payment request'
      });
    }

    // Initialize bookingDetails if it doesn't exist
    if (!user.bookingDetails) {
      user.bookingDetails = {};
    }

    // Update payment details for cash request
    user.bookingDetails.paymentMethod = 'cash';
    user.bookingDetails.paymentStatus = 'cash_pending';
    user.bookingDetails.cashPaymentRequest = {
      requestDate: new Date(),
      collectedDate: null,
      collectedBy: null,
      adminNotes: null
    };
    // Keep bookingCompleted = true since user has completed the booking process
    // They're just waiting for cash payment collection

    await user.save();


    res.json({
      success: true,
      message: 'Cash payment request created successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    logger.error('Create cash payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating cash payment request'
    });
  }
});

// REMOVED: Duplicate pending-cash-payments endpoint - using Booking table implementation instead

// Confirm cash payment collection (Admin only)
router.post('/confirm-cash-payment', auth, async (req, res) => {
  try {
    const { userId, adminNotes } = req.body;
    
    // Check if user is admin
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || !adminUser.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find the user with pending cash payment
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has pending cash payment
    if (user.bookingDetails.paymentStatus !== 'cash_pending') {
      return res.status(400).json({
        success: false,
        message: 'User does not have a pending cash payment'
      });
    }

    // Update payment status to collected
    user.bookingDetails.paymentStatus = 'cash_collected';
    user.bookingDetails.paymentDate = new Date();
    user.bookingDetails.cashPaymentRequest.collectedDate = new Date();
    user.bookingDetails.cashPaymentRequest.collectedBy = adminUser.email;
    user.bookingDetails.cashPaymentRequest.adminNotes = adminNotes || 'Payment collected by admin';
    user.bookingCompleted = true;

    let dyanpittIdData = null;

    // Generate Dnyanpitt ID if user doesn't have one
    if (!user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        
        // Send welcome email with Dnyanpitt ID
        await emailService.sendWelcomeEmail(user.email, user.fullName, dyanpittIdData.dyanpittId);
        
      } catch (error) {
        logger.error('Error generating Dnyanpitt ID for cash payment:', error);
        // Continue with payment confirmation even if ID generation fails
      }
    }

    await user.save();


    res.json({
      success: true,
      message: dyanpittIdData 
        ? 'Cash payment confirmed successfully! Dyanpitt ID has been generated and sent to the user.' 
        : 'Cash payment confirmed successfully!',
      user: user.getPublicProfile(),
      dyanpittId: dyanpittIdData?.dyanpittId
    });

  } catch (error) {
    logger.error('Confirm cash payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while confirming cash payment'
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

    // Get user first
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if membership is completed (required for Dnyanpitt ID generation)
    if (!user.membershipCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Membership must be completed before payment'
      });
    }

    // Update payment details
    user.bookingDetails.paymentId = paymentId;
    user.bookingDetails.paymentStatus = paymentStatus;
    user.bookingCompleted = paymentStatus === 'completed';

    let dyanpittIdData = null;

    // Generate Dnyanpitt ID if payment is successful and user doesn't have one
    if (paymentStatus === 'completed' && !user.hasDnyanpittId) {
      try {
        dyanpittIdData = await user.assignDyanpittId();
        
        // Send welcome email with Dnyanpitt ID
        await emailService.sendWelcomeEmail(user.email, user.fullName, dyanpittIdData.dyanpittId);
        
        // Member and booking data is now stored in User model directly
        // No separate Member/Booking records to update
        
      } catch (error) {
        logger.error('Error generating Dnyanpitt ID:', error);
        // Continue with payment completion even if ID generation fails
      }
    }

    await user.save();

    const response = {
      success: true,
      message: paymentStatus === 'completed' && dyanpittIdData 
        ? 'Payment completed successfully! Your Dnyanpitt ID has been generated.' 
        : 'Payment completed successfully',
      user: user.getPublicProfile()
    };

    // Include Dnyanpitt ID in response if generated
    if (dyanpittIdData) {
      response.dyanpittId = dyanpittIdData.dyanpittId;
      response.showCongratulations = true;
    }

    res.json(response);

  } catch (error) {
    logger.error('Complete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing payment'
    });
  }
});

// @route   POST /api/auth/upload-avatar
// @desc    Upload user avatar
// @access  Private
router.post('/upload-avatar', auth, uploadWithProcessing('avatar', { 
  createThumbnails: true, 
  maxWidth: 800, 
  maxHeight: 800, 
  quality: 85 
}), async (req, res) => {
  try {
    if (!req.processedFile) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file uploaded'
      });
    }

    const avatarUrl = req.processedFile.main.url;
    const thumbnailUrl = req.processedFile.thumbnail?.url;
    
    // Update user avatar in database
    const updateData = { avatar: avatarUrl };
    if (thumbnailUrl) {
      updateData.avatarThumbnail = thumbnailUrl;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
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
      message: 'Avatar uploaded and processed successfully',
      user: user.getPublicProfile(),
      avatarUrl,
      thumbnailUrl,
      compressionInfo: req.processedFile.compression
    });

  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar'
    });
  }
});

// @route   POST /api/auth/cleanup-temp-users
// @desc    Manually trigger cleanup of temporary users (admin endpoint)
// @access  Protected (development only)
router.post('/cleanup-temp-users', async (req, res) => {
  // SECURITY: Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  }
  try {
    const deletedCount = await cleanupService.manualCleanup();
    
    res.json({
      success: true,
      message: `Cleanup completed successfully`,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message
    });
  }
});

// @route   POST /api/auth/cleanup-incomplete-registrations
// @desc    Manually trigger cleanup of incomplete registrations (10-day period)
// @access  Protected (development only)
router.post('/cleanup-incomplete-registrations', async (req, res) => {
  // SECURITY: Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  }
  try {
    const deletedCount = await User.cleanupIncompleteRegistrations();
    
    res.json({
      success: true,
      message: `Incomplete registrations cleanup completed successfully`,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Incomplete registrations cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during incomplete registrations cleanup',
      error: error.message
    });
  }
});

// @route   GET /api/auth/debug-otp/:email
// @desc    Debug endpoint to get OTP for testing (development only)
// @access  Public (SECURED - only in development)
router.get('/debug-otp/:email', (req, res) => {
  // SECURITY: Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  }
  
  try {
    const { email } = req.params;
    const storedOTPs = verificationService.getStoredOTPs();
    const otpForEmail = verificationService.getOTPForEmail ? verificationService.getOTPForEmail(email) : null;
    
    res.json({
      success: true,
      email,
      otp: otpForEmail,
      allStoredOTPs: storedOTPs,
      timestamp: new Date().toISOString(),
      warning: 'DEBUG ENDPOINT - Development only'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting debug OTP',
      error: error.message
    });
  }
});

// @route   GET /api/auth/cleanup-status
// @desc    Get cleanup service status
// @access  Public (in production, this should be protected)
router.get('/cleanup-status', (req, res) => {
  try {
    const status = cleanupService.getStatus();
    
    res.json({
      success: true,
      cleanupService: status,
      message: status.isRunning ? 'Cleanup service is running' : 'Cleanup service is stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get cleanup status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cleanup status',
      error: error.message
    });
  }
});

// Test route for email debugging - REMOVE IN PRODUCTION
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    
    // Send a test OTP
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await emailService.sendOTP(email, testOTP, 'Test User');
    
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
        otp: testOTP, // Only for testing - remove in production
        instructions: [
          'Check your inbox for the OTP email',
          'Check your spam/junk folder if not in inbox',
          'Emails may take 1-2 minutes to arrive',
          `Email was sent via ${result.isConsoleMode ? 'Console Mode' : 'MailerSend'}`,
          result.messageId ? `Message ID: ${result.messageId}` : ''
        ].filter(Boolean)
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
      error: error.message
    });
  }
});

// TEMPORARY: Fix user booking completed flag for cash payment users
router.post('/admin/fix-user-booking-completed', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has cash pending bookings
    const Booking = require('../models/Booking');
    const cashPendingBookings = await Booking.find({ 
      userEmail: email, 
      paymentStatus: 'cash_pending' 
    });
    
    if (cashPendingBookings.length > 0) {
      // Update user to have bookingCompleted = true
      user.bookingCompleted = true;
      await user.save();
      
      
      res.json({
        success: true,
        message: 'User fixed successfully',
        user: {
          email: user.email,
          bookingCompleted: user.bookingCompleted,
          cashPendingBookings: cashPendingBookings.length
        }
      });
    } else {
      res.json({
        success: false,
        message: 'No cash pending bookings found for user'
      });
    }
    
  } catch (error) {
    logger.error('Fix user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;