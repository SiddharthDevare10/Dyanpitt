const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User's primary identifier for easy reference
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  
  // Dyanpeeth ID for direct reference
  dyanpittId: {
    type: String,
    required: false, // May be null if membership created before ID assignment
    index: true,
    trim: true
  },
  
  // Background Information
  visitedBefore: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  educationalBackground: {
    type: String,
    enum: ['High School', 'Graduation', 'Post Graduation', 'Doctorate Degree', 'Technical or Vocational School', 'Other'],
    required: true,
    index: true // For analytics
  },
  currentOccupation: {
    type: String,
    enum: ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired', 'Other'],
    required: true,
    index: true // For analytics
  },
  jobTitle: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Personal & Contact Details
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
  
  // Study Goals & Documentation - IMPORTANT FOR ANALYTICS
  examPreparation: {
    type: String,
    enum: ['MPSC', 'UPSC', 'Saral Seva', 'Railway', 'Staff Selection Commission', 'NOR-CET', 'Police Bharti', 'SRPF', 'CRPF', 'Army-GD', 'Army-NA', 'SSC (10th)', 'HSC (12th)', 'JEE', 'NEET', 'MHT-CET', 'UG', 'PG', 'PHD', 'MCR', 'CDS', 'DMER', 'Banking', 'Any Other'],
    required: true,
    index: true // CRUCIAL for exam analytics
  },
  examinationDate: {
    type: Date,
    required: true
  },
  
  // Photo Documentation
  selfiePhotoUrl: {
    type: String,
    default: null
  },
  selfiePhotoThumbnail: {
    type: String,
    default: null
  },
  
  // Tracking
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Optional notes
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for analytics
membershipSchema.index({ examPreparation: 1, submittedAt: 1 });
membershipSchema.index({ educationalBackground: 1, currentOccupation: 1 });
membershipSchema.index({ visitedBefore: 1, examPreparation: 1 });

// Static methods for analytics
membershipSchema.statics.getExamDistribution = async function() {
  return this.aggregate([
    { $group: { _id: '$examPreparation', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

membershipSchema.statics.getEducationDistribution = async function() {
  return this.aggregate([
    { $group: { _id: '$educationalBackground', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

membershipSchema.statics.getOccupationDistribution = async function() {
  return this.aggregate([
    { $group: { _id: '$currentOccupation', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Membership', membershipSchema);