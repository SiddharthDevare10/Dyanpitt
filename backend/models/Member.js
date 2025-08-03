const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  // Display email and dyanpittId first for better visibility in database
  email: {
    type: String,
    ref: 'User',
    required: true, // Email is primary reference until Dyanpitt ID is generated
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  dyanpittId: {
    type: String,
    ref: 'User',
    required: false, // Made optional - may not exist initially
    match: /^@DA\d{9}$/
  },
  
  // User ID reference for cases where Dyanpitt ID doesn't exist yet
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Not required - we use email first, then email + dyanpittId
  },
  
  // Membership Details
  visitedBefore: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  fatherName: {
    type: String,
    required: true,
    trim: true
  },
  parentContactNumber: {
    type: String,
    required: true,
    trim: true
  },
  educationalBackground: {
    type: String,
    required: true,
    enum: ['High School', 'Graduation', 'Post Graduation', 'Doctorate Degree', 'Technical or Vocational School', 'Other']
  },
  currentOccupation: {
    type: String,
    required: true,
    enum: ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired', 'Other']
  },
  currentAddress: {
    type: String,
    required: true,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  examPreparation: {
    type: String,
    required: true,
    enum: ['MPSC', 'UPSC', 'Saral Seva', 'Railway', 'Staff Selection Commission', 'NOR-CET', 'Police Bharti', 'SRPF', 'CRPF', 'Army-GD', 'Army-NA', 'SSC (10th)', 'HSC (12th)', 'JEE', 'NEET', 'MHT-CET', 'UG', 'PG', 'PHD', 'MCR', 'CDS', 'DMER', 'Banking', 'Any Other']
  },
  examinationDate: {
    type: Date,
    required: true
  },
  selfiePhotoUrl: {
    type: String,
    required: true
  },
  
  // Status
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
memberSchema.index({ email: 1 }, { unique: true }); // Ensure one membership per email
memberSchema.index({ dyanpittId: 1 }, { sparse: true }); // Sparse index for optional dyanpittId
memberSchema.index({ userId: 1 });

// Static method to find member by user (handles both states) - improved consistency
memberSchema.statics.findByUser = async function(user) {
  // Priority 1: Try to find by email + Dyanpitt ID if user has one
  if (user.hasDnyanpittId && user.dyanpittId) {
    const memberByDyanpittId = await this.findOne({ 
      email: user.email,
      dyanpittId: user.dyanpittId 
    });
    if (memberByDyanpittId) {
      return memberByDyanpittId;
    }
  }
  
  // Priority 2: Try to find by userId if available
  if (user._id) {
    const memberByUserId = await this.findOne({ 
      userId: user._id
    });
    if (memberByUserId) {
      return memberByUserId;
    }
  }
  
  // Priority 3: Fall back to email only
  const memberByEmail = await this.findOne({ 
    email: user.email
  });
  
  return memberByEmail;
};

// Static method to create member with proper references - improved consistency
memberSchema.statics.createForUser = async function(user, membershipData) {
  const memberData = {
    ...membershipData,
    email: user.email,
    userId: user._id // Always include userId for consistency
  };
  
  // Add Dyanpitt ID if user has one
  if (user.hasDnyanpittId && user.dyanpittId) {
    memberData.dyanpittId = user.dyanpittId;
  }
  
  return this.create(memberData);
};

// Instance method to update Dyanpitt ID reference after ID generation
memberSchema.methods.updateDyanpittIdReference = async function(dyanpittId) {
  this.dyanpittId = dyanpittId;
  return this.save();
};

module.exports = mongoose.model('Member', memberSchema);