const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  // Reference to User using Dyanpitt ID and Email
  dyanpittId: {
    type: String,
    ref: 'User',
    required: true,
    match: /^@DA\d{9}$/
  },
  email: {
    type: String,
    ref: 'User',
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
memberSchema.index({ dyanpittId: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ dyanpittId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Member', memberSchema);