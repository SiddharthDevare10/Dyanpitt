const logger = require('../utils/logger');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import IST utilities
const { getCurrentIST, toIST: toISTUtil } = require('../utils/istUtils');

// Helper function to convert datetime to IST (for timestamps)
const toIST = (date) => {
  if (!date) return date;
  // Use proper IST conversion from utils
  return toISTUtil(date);
};

// Helper function for date-only fields (like DOB) - preserve exact date without timezone shifts
const toDateOnly = (date) => {
  if (!date) return date;
  
  // If the date is already a string in YYYY-MM-DD format, parse it carefully
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-').map(Number);
    // Create date in UTC to avoid any timezone interpretation
    return new Date(Date.UTC(year, month - 1, day));
  }
  
  // If it's a Date object or datetime string, extract just the date part
  const d = new Date(date);
  
  // Handle the case where date might be interpreted in local timezone
  // Get the date components and create a UTC date
  if (typeof date === 'string') {
    // Parse the string to get date components
    const dateStr = date.split('T')[0]; // Get just the date part if it's an ISO string
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  
  // Fallback: Use local date components but create UTC date
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  dyanpittId: {
    type: String,
    required: false, // Made optional - only required after payment
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true,
    set: toDateOnly // Store as date-only without timezone conversion
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  currentAddress: {
    type: String,
    required: false, // Not required for temp users, will be required during registration
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Pending email during registration process
  pendingEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  },
  
  // Email verification token and expiry for persistent verification state
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpiry: {
    type: Date,
    default: null
  },
  
  // Cleanup timestamp for temporary users
  cleanupAt: {
    type: Date,
    default: null
  },
  
  // User Avatar
  avatar: {
    type: String,
    default: null
  },
  avatarThumbnail: {
    type: String,
    default: null
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null,
    set: toIST // Convert to IST when saving
  },
  
  // User Role
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  
  // Registration tracking
  registrationMonth: {
    type: String,
    required: false // Made optional - only set after payment
  },
  registrationNumber: {
    type: Number,
    required: false // Made optional - only set after payment
  },
  
  // Dnyanpitt ID tracking
  hasDnyanpittId: {
    type: Boolean,
    default: false
  },
  dnyanpittIdGenerated: {
    type: Date,
    default: null,
    set: toIST // Convert to IST when saving
  },
  
  // Note: Membership and Booking data now stored in separate tables
  
  // Progress tracking
  profileCompleted: {
    type: Boolean,
    default: false
  },
  membershipCompleted: {
    type: Boolean,
    default: false
  },
  bookingCompleted: {
    type: Boolean,
    default: false
  },
  
  // Cash payment request (temporary, expires in 2 days)
  pendingCashPaymentRequest: {
    type: Object,
    default: null
  }
  
  // Note: Booking details are now stored in separate Booking table
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries (removed duplicate indexes for email, dyanpittId, phoneNumber as they're already unique)
userSchema.index({ registrationMonth: 1, registrationNumber: 1 });
userSchema.index({ hasDnyanpittId: 1 });
userSchema.index({ dnyanpittIdGenerated: 1 });

// Index for cleanup of temporary users - TTL index for automatic cleanup
userSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for membership fields
userSchema.index({ 'membership.examPreparation': 1 });
userSchema.index({ 'membership.educationalBackground': 1 });
userSchema.index({ 'membership.currentOccupation': 1 });
userSchema.index({ 'membership.visitedBefore': 1 });
userSchema.index({ 'membership.submittedAt': 1 });

// Indexes for booking fields
userSchema.index({ 'bookings.paymentStatus': 1 });
userSchema.index({ 'bookings.membershipType': 1 });
userSchema.index({ 'bookings.timeSlot': 1 });
userSchema.index({ 'bookings.membershipStartDate': 1 });
userSchema.index({ 'bookings.membershipEndDate': 1 });
userSchema.index({ 'bookings.bookedAt': 1 });
userSchema.index({ 'bookings.isActive': 1 });
userSchema.index({ 'bookings.membershipActive': 1 });
userSchema.index({ 'bookings.paymentId': 1 });

// Compound indexes for common queries
userSchema.index({ 'bookings.paymentStatus': 1, 'bookings.membershipActive': 1 });
userSchema.index({ 'bookings.membershipStartDate': 1, 'bookings.membershipEndDate': 1 });
userSchema.index({ 'bookings.timeSlot': 1, 'bookings.membershipType': 1 });

// Pre-save middleware for password hashing and booking calculations
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // Calculate membership end dates for bookings
  if (this.isModified('bookings')) {
    this.bookings.forEach(booking => {
      if (booking.membershipStartDate && booking.membershipDuration && !booking.membershipEndDate) {
        const startDate = new Date(booking.membershipStartDate);
        let endDate = new Date(startDate);
        
        switch (booking.membershipDuration) {
          case '1 Day':
            endDate.setDate(startDate.getDate() + 1);
            break;
          case '8 Days':
            endDate.setDate(startDate.getDate() + 8);
            break;
          case '15 Days':
            endDate.setDate(startDate.getDate() + 15);
            break;
          case '1 Month':
            endDate.setMonth(startDate.getMonth() + 1);
            break;
          case '2 Months':
            endDate.setMonth(startDate.getMonth() + 2);
            break;
          case '3 Months':
            endDate.setMonth(startDate.getMonth() + 3);
            break;
          case '4 Months':
            endDate.setMonth(startDate.getMonth() + 4);
            break;
          case '5 Months':
            endDate.setMonth(startDate.getMonth() + 5);
            break;
          case '6 Months':
            endDate.setMonth(startDate.getMonth() + 6);
            break;
          case '7 Months':
            endDate.setMonth(startDate.getMonth() + 7);
            break;
          case '8 Months':
            endDate.setMonth(startDate.getMonth() + 8);
            break;
          case '9 Months':
            endDate.setMonth(startDate.getMonth() + 9);
            break;
          case '10 Months':
            endDate.setMonth(startDate.getMonth() + 10);
            break;
          case '11 Months':
            endDate.setMonth(startDate.getMonth() + 11);
            break;
          case '12 Months':
            endDate.setMonth(startDate.getMonth() + 12);
            break;
          default:
            endDate.setMonth(startDate.getMonth() + 1); // Default to 1 month
        }
        
        booking.membershipEndDate = endDate;
      }
      
      // Update lastUpdated for modified bookings
      if (booking.isModified && booking.isModified()) {
        booking.lastUpdated = new Date();
      }
    });
  }
  
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Note: Membership management now handled by separate Membership model

// Note: Booking management now handled by separate Booking model

// Generate Dyanpitt ID with atomic operation to prevent race conditions
userSchema.statics.generateDyanpittId = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}${month}`;
  
  // Use MongoDB's findOneAndUpdate with atomic increment to prevent race conditions
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      // Find the highest registration number for this month and increment atomically
      const result = await this.findOneAndUpdate(
        { 
          registrationMonth: monthKey,
          isActive: { $ne: false } // Exclude system counter users
        },
        { $inc: { registrationNumber: 1 } },
        { 
          sort: { registrationNumber: -1 },
          new: true,
          upsert: false
        }
      );
      
      
      let nextNumber;
      if (result) {
        nextNumber = result.registrationNumber;
      } else {
        // No existing user for this month, start with 1
        nextNumber = 1;
      }
      
      const registrationNumber = String(nextNumber).padStart(3, '0');
      const generatedId = `@DA${year}${month}${registrationNumber}`;
      
      
      return {
        dyanpittId: generatedId,
        registrationMonth: monthKey,
        registrationNumber: nextNumber
      };
      
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate Dyanpitt ID after ${maxAttempts} attempts: ${error.message}`);
      }
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};

// Assign Dyanpitt ID to user after payment (instance method) - atomic operation
userSchema.methods.assignDyanpittId = async function() {
  if (this.hasDnyanpittId) {
    throw new Error('User already has a Dyanpitt ID');
  }
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const { dyanpittId, registrationMonth, registrationNumber } = await this.constructor.generateDyanpittId();
      
      // Use atomic update to prevent race conditions
      const updateResult = await this.constructor.findOneAndUpdate(
        { 
          _id: this._id,
          hasDnyanpittId: false // Ensure user still doesn't have ID
        },
        {
          $set: {
            dyanpittId,
            registrationMonth,
            registrationNumber,
            hasDnyanpittId: true,
            dnyanpittIdGenerated: new Date()
          }
        },
        { new: true }
      );
      
      if (!updateResult) {
        throw new Error('User already has a Dyanpitt ID or user not found');
      }
      
      // Update current instance
      this.dyanpittId = dyanpittId;
      this.registrationMonth = registrationMonth;
      this.registrationNumber = registrationNumber;
      this.hasDnyanpittId = true;
      this.dnyanpittIdGenerated = new Date();
      
      // Update primaryId in related tables
      await this.updateRelatedTablesPrimaryId(this.email, dyanpittId);
      
      // Update tour requests with Dyanpitt ID
      try {
        const TourLinkingService = require('../services/tourLinkingService');
        await TourLinkingService.updateTourRequestsWithDyanpittId(this.email, dyanpittId);
      } catch (error) {
        logger.error('Error updating tour requests with Dyanpitt ID:', error);
        // Don't fail the ID assignment if tour update fails
      }
      
      return {
        dyanpittId,
        registrationMonth,
        registrationNumber
      };
      
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to assign Dyanpitt ID after ${maxAttempts} attempts: ${error.message}`);
      }
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
};

// Method to update primaryId - simplified since all data is in User model
userSchema.methods.updateRelatedTablesPrimaryId = async function(_oldPrimaryId, _newPrimaryId) {
  // No-op: All data is in User model, no related tables to update
};

// Note: OTP functionality moved to JWT-based tokens for better security

// Find by email or Dyanpitt ID (updated for optional Dyanpitt ID)
userSchema.statics.findByEmailOrDyanpittId = async function(identifier) {
  const isEmail = identifier.includes('@') && !identifier.startsWith('@DA');
  
  if (isEmail) {
    return this.findOne({ email: identifier });
  } else {
    // For Dyanpitt ID, ensure it exists and is not null
    return this.findOne({ 
      dyanpittId: identifier,
      hasDnyanpittId: true 
    });
  }
};

// Check if email exists (only verified users)
userSchema.statics.emailExists = async function(email) {
  const normalizedEmail = email.toLowerCase();
  
  // Only check for verified users with this email
  const verifiedUser = await this.findOne({ 
    email: normalizedEmail, 
    isEmailVerified: true 
  });
  
  return !!verifiedUser;
};

// Check if phone exists
userSchema.statics.phoneExists = async function(phoneNumber) {
  const user = await this.findOne({ phoneNumber });
  return !!user;
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = getCurrentIST();
  return this.save({ validateBeforeSave: false });
};

// Get user's bookings from separate Booking table
userSchema.methods.getBookings = async function() {
  const Booking = require('./Booking');
  return await Booking.find({ 
    $or: [
      { userId: this._id },
      { userEmail: this.email },
      ...(this.dyanpittId ? [{ dyanpittId: this.dyanpittId }] : [])
    ]
  }).sort({ bookedAt: -1 });
};

// Get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    // Display email and dyanpittId first for better visibility
    email: this.email,
    dyanpittId: this.dyanpittId,
    id: this._id,
    fullName: this.fullName,
    phoneNumber: this.phoneNumber,
    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    avatar: this.avatar,
    avatarThumbnail: this.avatarThumbnail,
    isEmailVerified: this.isEmailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    role: this.role,
    // Note: membership and booking data now in separate tables
    profileCompleted: this.profileCompleted,
    membershipCompleted: this.membershipCompleted,
    bookingCompleted: this.bookingCompleted,
    hasDnyanpittId: this.hasDnyanpittId,
    dnyanpittIdGenerated: this.dnyanpittIdGenerated,
    pendingCashPaymentRequest: this.pendingCashPaymentRequest,
    // Helper method to get primary identifier
    primaryIdentifier: this.hasDnyanpittId ? this.dyanpittId : this.email
  };
};

// Check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin' || this.role === 'super_admin';
};

// Check if user is super admin
userSchema.methods.isSuperAdmin = function() {
  return this.role === 'super_admin';
};

// Schedule cleanup for temporary user (2 hours - industry standard for profile completion)
userSchema.methods.scheduleCleanup = function(minutesFromNow = 120) {
  const cleanupTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
  this.cleanupAt = cleanupTime;
  return this.save();
};

// Cancel cleanup (called when user completes registration)
userSchema.methods.cancelCleanup = function() {
  this.cleanupAt = null;
  return this.save();
};

// Generate persistent email verification token (1 hour validity)
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

// Verify email verification token
userSchema.methods.verifyEmailVerificationToken = function(token) {
  if (!this.emailVerificationToken || !this.emailVerificationExpiry) {
    return false;
  }
  
  if (Date.now() > this.emailVerificationExpiry.getTime()) {
    // Token expired, clear it
    this.emailVerificationToken = null;
    this.emailVerificationExpiry = null;
    return false;
  }
  
  return this.emailVerificationToken === token;
};

// Clear email verification token
userSchema.methods.clearEmailVerificationToken = function() {
  this.emailVerificationToken = null;
  this.emailVerificationExpiry = null;
  return this.save();
};

// Static method to manually cleanup expired temporary users
userSchema.statics.cleanupExpiredTempUsers = async function() {
  try {
    const result = await this.deleteMany({
      $or: [
        // Users with temp emails that haven't completed registration
        { 
          email: { $regex: /^temp_.*@temp\.local$/ },
          isEmailVerified: false
        },
        // Users with pending emails that are older than 35 minutes and not verified
        {
          pendingEmail: { $exists: true, $ne: null },
          isEmailVerified: false,
          createdAt: { $lt: new Date(Date.now() - 35 * 60 * 1000) }
        }
      ]
    });
    
    return result.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up temporary users:', error);
    return 0;
  }
};

// Static method to cleanup expired cash payment requests
userSchema.statics.cleanupExpiredCashPaymentRequests = async function() {
  try {
    const now = new Date();
    
    // Find users with expired cash payment requests
    const usersWithExpiredRequests = await this.find({
      'pendingCashPaymentRequest.expiresAt': { $lt: now },
      'pendingCashPaymentRequest': { $ne: null }
    });
    
    // Clear expired requests
    const result = await this.updateMany(
      {
        'pendingCashPaymentRequest.expiresAt': { $lt: now },
        'pendingCashPaymentRequest': { $ne: null }
      },
      {
        $unset: { 
          pendingCashPaymentRequest: "",
          cashPaymentPending: ""
        },
        $set: {
          bookingCompleted: false
        }
      }
    );
    
    
    // Log details of cleaned requests
    usersWithExpiredRequests.forEach(user => {
      if (user.pendingCashPaymentRequest) {
        // Request cleaned successfully
      }
    });
    
    return result.modifiedCount;
  } catch (error) {
    logger.error('Error cleaning up expired cash payment requests:', error);
    return 0;
  }
};

// Static method to cleanup incomplete registrations (24-hour period for temp users, 10-day for verified users)
userSchema.statics.cleanupIncompleteRegistrations = async function() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    
    // Cleanup temp users who haven't completed registration within 24 hours
    const tempUserResult = await this.deleteMany({
      $or: [
        // Temp users with expired verification tokens
        {
          emailVerificationToken: { $exists: true },
          emailVerificationExpiry: { $lt: new Date() },
          profileCompleted: false
        },
        // Temp users older than 24 hours who haven't completed profile
        {
          email: { $regex: /^temp_.*@temp\.local$/ },
          profileCompleted: false,
          createdAt: { $lt: twentyFourHoursAgo }
        }
      ]
    });
    
    // Cleanup verified users who registered but never completed membership/payment (10-day period)
    const verifiedUserResult = await this.deleteMany({
      hasDnyanpittId: false,
      isEmailVerified: true,
      profileCompleted: true,
      membershipCompleted: false,
      createdAt: { $lt: tenDaysAgo }
    });
    
    const totalDeleted = tempUserResult.deletedCount + verifiedUserResult.deletedCount;
    return totalDeleted;
  } catch (error) {
    logger.error('Error cleaning up incomplete registrations:', error);
    return 0;
  }
};

// Static methods for querying users with membership/booking filters
userSchema.statics.getAllUsersWithMembership = async function(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  // Build query from filters
  const query = { membershipCompleted: true };
  
  if (filters.examPreparation) {
    query['membership.examPreparation'] = filters.examPreparation;
  }
  
  if (filters.educationalBackground) {
    query['membership.educationalBackground'] = filters.educationalBackground;
  }
  
  if (filters.currentOccupation) {
    query['membership.currentOccupation'] = filters.currentOccupation;
  }
  
  if (filters.visitedBefore) {
    query['membership.visitedBefore'] = filters.visitedBefore;
  }
  
  if (filters.searchTerm) {
    const searchRegex = { $regex: filters.searchTerm, $options: 'i' };
    query.$or = [
      { email: searchRegex },
      { dyanpittId: searchRegex },
      { fullName: searchRegex },
      { 'membership.fatherName': searchRegex }
    ];
  }
  
  const [users, total] = await Promise.all([
    this.find(query)
      .select('-password')
      .sort({ 'membership.submittedAt': -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  };
};

userSchema.statics.getAllUsersWithBookings = async function(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  // Build aggregation pipeline for booking filters
  const pipeline = [
    { $match: { bookingCompleted: true } }
  ];
  
  // Add booking filters
  if (filters.paymentStatus || filters.membershipType || filters.timeSlot || filters.membershipActive !== undefined) {
    const bookingMatch = {};
    
    if (filters.paymentStatus) {
      bookingMatch['bookings.paymentStatus'] = filters.paymentStatus;
    }
    
    if (filters.membershipType) {
      bookingMatch['bookings.membershipType'] = filters.membershipType;
    }
    
    if (filters.timeSlot) {
      bookingMatch['bookings.timeSlot'] = filters.timeSlot;
    }
    
    if (filters.membershipActive !== undefined) {
      bookingMatch['bookings.membershipActive'] = filters.membershipActive;
    }
    
    pipeline.push({ $match: bookingMatch });
  }
  
  // Add search filter
  if (filters.searchTerm) {
    const searchRegex = { $regex: filters.searchTerm, $options: 'i' };
    pipeline.push({
      $match: {
        $or: [
          { email: searchRegex },
          { dyanpittId: searchRegex },
          { fullName: searchRegex },
          { 'bookings.paymentId': searchRegex }
        ]
      }
    });
  }
  
  // Remove password field
  pipeline.push({
    $project: { password: 0 }
  });
  
  // Add sorting
  pipeline.push({
    $sort: { 'bookings.bookedAt': -1 }
  });
  
  const [users, total] = await Promise.all([
    this.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ]),
    this.aggregate([
      ...pipeline.slice(0, -1), // Remove sort for count
      { $count: 'total' }
    ]).then(result => result[0]?.total || 0)
  ]);
  
  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  };
};

userSchema.statics.findUserWithMembership = async function(identifier) {
  const isEmail = identifier.includes('@') && !identifier.startsWith('@DA');
  
  const query = isEmail 
    ? { email: identifier, membershipCompleted: true }
    : { dyanpittId: identifier, hasDnyanpittId: true, membershipCompleted: true };
  
  return this.findOne(query).select('-password');
};

userSchema.statics.findUserWithBookings = async function(identifier) {
  const isEmail = identifier.includes('@') && !identifier.startsWith('@DA');
  
  const query = isEmail 
    ? { email: identifier, bookingCompleted: true }
    : { dyanpittId: identifier, hasDnyanpittId: true, bookingCompleted: true };
  
  return this.findOne(query).select('-password');
};


module.exports = mongoose.model('User', userSchema);