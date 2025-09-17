const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
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
    default: null
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
    default: null
  },
  
  // Membership Details
  membershipDetails: {
    visitedBefore: {
      type: String,
      enum: ['yes', 'no']
    },
    fatherName: {
      type: String,
      trim: true
    },
    parentContactNumber: {
      type: String,
      trim: true
    },
    educationalBackground: {
      type: String,
      enum: ['High School', 'Graduation', 'Post Graduation', 'Doctorate Degree', 'Technical or Vocational School', 'Other']
    },
    currentOccupation: {
      type: String,
      enum: ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired', 'Other']
    },
    currentAddress: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    examPreparation: {
      type: String,
      enum: ['MPSC', 'UPSC', 'Saral Seva', 'Railway', 'Staff Selection Commission', 'NOR-CET', 'Police Bharti', 'SRPF', 'CRPF', 'Army-GD', 'Army-NA', 'SSC (10th)', 'HSC (12th)', 'JEE', 'NEET', 'MHT-CET', 'UG', 'PG', 'PHD', 'MCR', 'CDS', 'DMER', 'Banking', 'Any Other']
    },
    examinationDate: {
      type: Date
    },
    studyRoomDuration: {
      type: String,
      enum: ['Less than a month', '1 Month', '2 Month', '3 Month', '4 Month', '5 Month', '6 Month', 'More Than 6 Months', '1 Year', 'More Than 1 Year']
    },
    selfiePhotoUrl: {
      type: String
    },
    selfiePhotoThumbnail: {
      type: String
    }
  },
  
  // Booking Details
  bookingDetails: {
    // Time slot selection
    timeSlot: {
      type: String,
      enum: [
        'Day Batch (7:00 AM - 10:00 PM)',
        'Night Batch (10:00 PM - 7:00 AM)', 
        '24 Hours Batch',
      ]
    },
    
    // Membership type
    membershipType: {
      type: String,
      enum: ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Dyanasmi Kaksh']
    },
    
    // Membership duration
    membershipDuration: {
      type: String,
      enum: [
        '1 Day', '8 Days', '15 Days', 
        '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
        '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
      ]
    },
    
    // Membership start date (within 30 days)
    membershipStartDate: {
      type: Date,
      validate: {
        validator: function(date) {
          // Compare dates only, not times
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          
          const thirtyDaysFromToday = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
          
          return startDate >= today && startDate <= thirtyDaysFromToday;
        },
        message: 'Membership start date must be within 30 days from today'
      }
    },
    
    // Preferred seat
    preferredSeat: {
      type: String
    },
    
    // Calculated fields
    membershipEndDate: {
      type: Date
    },
    totalAmount: {
      type: Number
    },
    
    // Payment details
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    paymentId: {
      type: String
    },
    paymentDate: {
      type: Date
    }
  },
  
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
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries (removed duplicate indexes for email, dyanpittId, phoneNumber as they're already unique)
userSchema.index({ registrationMonth: 1, registrationNumber: 1 });
userSchema.index({ hasDnyanpittId: 1 });
userSchema.index({ dnyanpittIdGenerated: 1 });

// Index for cleanup of temporary users - TTL index for automatic cleanup
userSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

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
        { registrationMonth: monthKey },
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
        // Create a counter document to track the sequence
        try {
          await this.create({
            email: `counter_${monthKey}@system.local`,
            dyanpittId: `counter_${monthKey}`,
            fullName: 'System Counter',
            phoneNumber: `+91${monthKey}0000`,
            dateOfBirth: now,
            gender: 'other',
            password: 'system',
            registrationMonth: monthKey,
            registrationNumber: 1,
            isEmailVerified: true,
            profileCompleted: false,
            isActive: false // Mark as inactive system user
          });
          nextNumber = 1;
        } catch {
          // Counter might have been created by another process, try again
          attempts++;
          continue;
        }
      }
      
      const registrationNumber = String(nextNumber).padStart(3, '0');
      
      return {
        dyanpittId: `@DA${year}${month}${registrationNumber}`,
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
  this.lastLogin = new Date();
  return this.save();
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
    membershipDetails: this.membershipDetails,
    bookingDetails: this.bookingDetails,
    profileCompleted: this.profileCompleted,
    membershipCompleted: this.membershipCompleted,
    bookingCompleted: this.bookingCompleted,
    hasDnyanpittId: this.hasDnyanpittId,
    dnyanpittIdGenerated: this.dnyanpittIdGenerated,
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
    
    console.log(`Cleaned up ${result.deletedCount} expired temporary users`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up temporary users:', error);
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
    console.log(`Cleaned up ${tempUserResult.deletedCount} incomplete temp registrations (24h) and ${verifiedUserResult.deletedCount} incomplete verified registrations (10d)`);
    return totalDeleted;
  } catch (error) {
    console.error('Error cleaning up incomplete registrations:', error);
    return 0;
  }
};

module.exports = mongoose.model('User', userSchema);