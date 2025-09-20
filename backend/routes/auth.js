const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken: auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const emailService = require('../services/emailService');
const verificationService = require('../services/verificationService');
const { uploadWithProcessing } = require('../middleware/upload');
const cleanupService = require('../services/cleanupService');

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
      console.log('Deleted uploaded file due to validation failure:', filePath);
    }
  } catch (err) {
    console.error('Failed to delete uploaded file:', err.message);
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
      console.error('Email sending failed:', emailResult.error);
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
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Invalid input - ' + errors.array().map(e => e.msg).join(', '),
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;
    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('=== OTP VERIFICATION DEBUG ===');
      console.log('Raw request body:', req.body);
      console.log('Email (raw):', email);
      console.log('OTP (raw):', otp);
      console.log('OTP type:', typeof otp);
      console.log('OTP length:', otp ? otp.length : 'undefined');
      console.log('All stored OTPs:', verificationService.getStoredOTPs());
    }

    // Verify OTP using verification service FIRST
    if (!verificationService.verifyOTP(email, otp)) {
      console.log('OTP verification failed');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('OTP verified successfully');
    }
    
    // Find temp user by pending email and mark as verified
    let tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: false });
    
    // RECOVERY MECHANISM: If temp user not found, check if there's already a verified user
    // or create a new temp user if OTP was valid but user was somehow lost
    if (!tempUser) {
      console.log('No unverified temp user found, checking for other scenarios...');
      
      // Check if there's already a verified temp user for this email
      const existingVerifiedUser = await User.findOne({ pendingEmail: email, isEmailVerified: true });
      
      if (existingVerifiedUser) {
        // User already verified, just return success
        console.log('User already verified, returning success');
        return res.json({
          success: true,
          message: 'Email verified successfully'
        });
      }
      
      // Create a new temp user since OTP was valid but user record is missing
      console.log('Creating new temp user for valid OTP verification');
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
      console.log('Created recovery temp user for email:', email);
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

    const { email, fullName, phoneNumber, dateOfBirth, gender, password } = req.body;

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

    // Find verified temp user by pending email
    let tempUser = await User.findOne({ pendingEmail: email, isEmailVerified: true });
    
    // VERIFICATION RECOVERY: If temp user not found, check if email was recently verified
    if (!tempUser) {
      console.log('Temp user not found, checking verification recovery options...');
      
      // First, check if there's a user with valid persistent verification token
      const tokenVerifiedUser = await User.findOne({ 
        pendingEmail: email, 
        emailVerificationToken: { $exists: true, $ne: null },
        emailVerificationExpiry: { $gt: new Date() }
      });
      
      if (tokenVerifiedUser) {
        console.log('Found user with valid persistent verification token');
        tempUser = tokenVerifiedUser;
      } else {
        // Check if there's an unverified temp user that we can recover
        const unverifiedTempUser = await User.findOne({ pendingEmail: email, isEmailVerified: false });
        
        // Check if OTP verification service still has valid verification for this email
        const hasValidOTP = verificationService.hasOTP && verificationService.hasOTP(email);
        
        if (unverifiedTempUser && hasValidOTP) {
          console.log('Found recovery path: unverified temp user with valid OTP');
          // Mark as verified and use this user
          unverifiedTempUser.isEmailVerified = true;
          unverifiedTempUser.generateEmailVerificationToken();
          await unverifiedTempUser.save();
          tempUser = unverifiedTempUser;
        } else {
          // Create a new verified temp user if verification service confirms email was verified
          console.log('Creating new verified temp user for recovery');
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
          console.log('Created recovery temp user for email:', email);
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
        console.log('Cleaned up incomplete user with phone:', phoneNumber);
      }
    }

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Registration Debug:');
      console.log('Looking for email:', email);
      console.log('Found tempUser:', tempUser ? 'YES' : 'NO');
    }
    
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
      
      console.log(`Avatar processed: ${req.processedFile.compression.compressionRatio} compression, Original: ${(req.processedFile.original.size / 1024).toFixed(2)}KB, Compressed: ${(req.processedFile.main.size / 1024).toFixed(2)}KB`);
    }

    // Update user with complete information (NO Dyanpitt ID generation yet)
    tempUser.email = email; // Now assign the real email
    tempUser.fullName = fullName;
    tempUser.phoneNumber = phoneNumber;
    tempUser.dateOfBirth = new Date(dateOfBirth);
    tempUser.gender = gender;
    tempUser.password = password; // Will be hashed by pre-save middleware
    tempUser.pendingEmail = undefined; // Remove the pending email field
    tempUser.profileCompleted = true; // Mark profile as completed since all basic info is provided
    tempUser.hasDnyanpittId = false; // User doesn't have Dyanpitt ID yet
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

    // Send intermediate welcome email (without Dyanpitt ID)
    try {
      await emailService.sendRegistrationCompleteEmail(email, fullName);
    } catch (emailError) {
      console.error('Email sending failed, but continuing with registration:', emailError);
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
router.post('/login', loginLimiter, [
  body('email').optional().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('dyanpittId').optional().matches(/^@DA\d{9}$/),
  body('password').exists()
], async (req, res) => {
  try {
    console.log('🔐 LOGIN REQUEST RECEIVED:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      body: {
        email: req.body.email || 'not provided',
        dyanpittId: req.body.dyanpittId || 'not provided',
        hasPassword: !!req.body.password,
        rememberMe: req.body.rememberMe
      }
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔐 LOGIN VALIDATION FAILED:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, dyanpittId, password, rememberMe } = req.body;
    const identifier = email || dyanpittId;
    
    console.log('🔐 LOGIN PROCESSING:', { identifier, hasPassword: !!password });

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or Dyanpitt ID is required'
      });
    }

    // Find user by email or Dyanpitt ID (updated for optional Dyanpitt ID)
    console.log('🔐 LOOKING UP USER:', identifier);
    const user = await User.findByEmailOrDyanpittId(identifier);
    if (!user) {
      console.log('🔐 USER NOT FOUND:', identifier);
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    console.log('🔐 USER FOUND:', { userId: user._id, email: user.email });

    // Check if account is active and email verified
    if (!user.isActive || !user.isEmailVerified) {
      console.log('🔐 ACCOUNT NOT ACTIVE OR EMAIL NOT VERIFIED:', {
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified
      });
      return res.status(400).json({
        success: false,
        message: 'Account is not active or email not verified'
      });
    }

    // SECURITY: Ensure user has completed full registration (has real password and email)
    if (!user.email || user.email.includes('@temp.local') ||
        user.password === 'temporary' || user.pendingEmail) {
      console.log('🔐 INCOMPLETE REGISTRATION:', {
        hasEmail: !!user.email,
        isTempEmail: user.email?.includes('@temp.local'),
        isTempPassword: user.password === 'temporary',
        hasPendingEmail: !!user.pendingEmail
      });
      return res.status(400).json({
        success: false,
        message: 'Please complete your registration first'
      });
    }
    
    // Note: Users can login without Dyanpitt ID (will get it after first membership payment)

    // Check password
    console.log('🔐 CHECKING PASSWORD...');
    const isMatch = await user.comparePassword(password);
    console.log('🔐 PASSWORD CHECK RESULT:', isMatch);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    console.log('🔐 UPDATING LAST LOGIN...');
    await user.updateLastLogin();

    // Generate JWT token
    console.log('🔐 GENERATING JWT TOKEN...');
    const expiresIn = rememberMe ? '30d' : '15m'; // Industry standard: 15 minutes, 30 days for remember me
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn }
    );

    console.log('🔐 LOGIN SUCCESS - SENDING RESPONSE');
    res.json({
      success: true,
      message: user.hasDnyanpittId ? 'Login successful' : 'Login successful. Complete your membership to get your Dyanpitt ID.',
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
router.post('/forgot-password', forgotLimiter, [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false })
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

    // Generate and send OTP for password reset using verification service
    if (process.env.NODE_ENV === 'development') {
      console.log('Sending password reset OTP to:', email);
    }
    const emailResult = await verificationService.sendPasswordResetOTP(email, user.fullName);
    if (process.env.NODE_ENV === 'development') {
      console.log('Email result:', emailResult);
      console.log('OTPs after sending:', verificationService.getStoredOTPs());
    }
    
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
    if (!verificationService.verifyOTP(email, otp)) {
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
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
], async (req, res) => {
  try {
    console.log('Reset password request received:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Reset password validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    console.log('User found:', !!user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Note: OTP should have already been verified in verify-reset-otp endpoint
    // We'll verify it one more time for security, but won't delete it if it fails
    console.log('Attempting to verify OTP:', { email, otp });
    const otpValid = verificationService.verifyOTP(email, otp);
    console.log('OTP verification result:', otpValid);
    
    // Debug: Check what OTPs are stored
    console.log('Current stored OTPs:', verificationService.getStoredOTPs ? verificationService.getStoredOTPs() : 'No debug method available');
    if (!otpValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();
    
    // Clear the OTP from verification service after successful password reset
    console.log('Password reset successful, clearing OTP');
    verificationService.clearOTP(email);

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
router.post('/update-membership', auth, uploadWithProcessing('selfiePhoto', { 
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
      
      console.log(`Selfie processed: ${req.processedFile.compression.compressionRatio} compression achieved`);
    }
    
    // Validate required fields
    const requiredFields = ['visitedBefore', 'fatherName', 'parentContactNumber', 'educationalBackground', 'currentOccupation', 'currentAddress', 'examPreparation', 'examinationDate'];
    
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
        console.log('Dnyanpitt ID generated:', dyanpittIdData.dyanpittId);
        
        // Send welcome email with Dnyanpitt ID
        await emailService.sendWelcomeEmail(user.email, user.fullName, dyanpittIdData.dyanpittId);
        
        // Member and booking data is now stored in User model directly
        // No separate Member/Booking records to update
        
      } catch (error) {
        console.error('Error generating Dnyanpitt ID:', error);
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
    console.error('Complete payment error:', error);
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

    console.log(`Avatar updated: ${req.processedFile.compression.compressionRatio} compression achieved`);

    res.json({
      success: true,
      message: 'Avatar uploaded and processed successfully',
      user: user.getPublicProfile(),
      avatarUrl,
      thumbnailUrl,
      compressionInfo: req.processedFile.compression
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
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
    console.log('Manual cleanup triggered via API');
    const deletedCount = await cleanupService.manualCleanup();
    
    res.json({
      success: true,
      message: `Cleanup completed successfully`,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual cleanup error:', error);
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
    console.log('Manual cleanup of incomplete registrations triggered via API');
    const deletedCount = await User.cleanupIncompleteRegistrations();
    
    res.json({
      success: true,
      message: `Incomplete registrations cleanup completed successfully`,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Incomplete registrations cleanup error:', error);
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
    console.error('Get cleanup status error:', error);
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

    console.log(`Testing email delivery to: ${email}`);
    
    // Send a test OTP
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await emailService.sendOTP(email, testOTP, 'Test User');
    
    console.log('Email send result:', result);
    
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
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
      error: error.message
    });
  }
});

module.exports = router;