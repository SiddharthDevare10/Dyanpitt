const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  // Reference to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
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
  studyRoomDuration: {
    type: String,
    required: true,
    enum: ['Less than a month', '1 Month', '2 Month', '3 Month', '4 Month', '5 Month', '6 Month', 'More Than 6 Months', '1 Year', 'More Than 1 Year']
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

// Index for faster queries (userId already has unique constraint)

module.exports = mongoose.model('Member', memberSchema);