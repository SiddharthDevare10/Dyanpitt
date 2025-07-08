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
    required: true,
    unique: true,
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
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  
  // OTP for registration
  otpCode: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  
  // User Avatar
  avatar: {
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
  
  // Registration tracking
  registrationMonth: {
    type: String,
    required: true // Format: "YYYYMM"
  },
  registrationNumber: {
    type: Number,
    required: true
  },
  
  // Pending email during registration process
  pendingEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
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
        'Calista Garden (7:00 AM - 7:00 PM)'
      ]
    },
    
    // Membership type
    membershipType: {
      type: String,
      enum: ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Calista Garden']
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
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          return date >= now && date <= thirtyDaysFromNow;
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

// Generate Dyanpitt ID
userSchema.statics.generateDyanpittId = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}${month}`;
  
  // Find the highest registration number for this month
  const lastUser = await this.findOne(
    { registrationMonth: monthKey },
    {},
    { sort: { registrationNumber: -1 } }
  );
  
  const nextNumber = lastUser ? lastUser.registrationNumber + 1 : 1;
  const registrationNumber = String(nextNumber).padStart(3, '0');
  
  return {
    dyanpittId: `@DA${year}${month}${registrationNumber}`,
    registrationMonth: monthKey,
    registrationNumber: nextNumber
  };
};

// Generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = otp;
  this.otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(otp) {
  if (!this.otpCode || !this.otpExpires) {
    return false;
  }
  
  if (this.otpExpires < new Date()) {
    return false;
  }
  
  return this.otpCode === otp;
};

// Clear OTP
userSchema.methods.clearOTP = function() {
  this.otpCode = null;
  this.otpExpires = null;
};

// Find by email or Dyanpitt ID
userSchema.statics.findByEmailOrDyanpittId = async function(identifier) {
  const isEmail = identifier.includes('@') && !identifier.startsWith('@DA');
  const query = isEmail ? { email: identifier } : { dyanpittId: identifier };
  return this.findOne(query);
};

// Check if email exists (verified users or pending email)
userSchema.statics.emailExists = async function(email) {
  const normalizedEmail = email.toLowerCase();
  
  // Check for verified users with this email
  const verifiedUser = await this.findOne({ 
    email: normalizedEmail, 
    isEmailVerified: true 
  });
  
  // Also check for pending registrations with this email
  const pendingUser = await this.findOne({ 
    pendingEmail: normalizedEmail, 
    isEmailVerified: false 
  });
  
  return !!(verifiedUser || pendingUser);
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
    id: this._id,
    email: this.email,
    dyanpittId: this.dyanpittId,
    fullName: this.fullName,
    phoneNumber: this.phoneNumber,
    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);