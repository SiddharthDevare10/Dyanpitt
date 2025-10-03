const mongoose = require('mongoose');

const tourRequestSchema = new mongoose.Schema({
  // Email as the main identifier for tour requests (since no Dyanpitt ID exists yet)
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // User ID - linked when user registers
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Dyanpitt ID - updated when user gets their ID
  dyanpittId: {
    type: String,
    default: null,
    sparse: true
  },
  
  // Linking timestamp
  linkedAt: {
    type: Date,
    default: null
  },
  
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  
  // Tour Details
  tourDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        // Tour date must be at least tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        
        return selectedDate >= tomorrow;
      },
      message: 'Tour date must be at least tomorrow'
    }
  },
  tourTime: {
    type: String,
    required: true,
    enum: [
      "9:00 AM - 10:00 AM",
      "10:00 AM - 11:00 AM", 
      "11:00 AM - 12:00 PM",
      "12:00 PM - 1:00 PM",
      "1:00 PM - 2:00 PM",
      "2:00 PM - 3:00 PM",
      "3:00 PM - 4:00 PM",
      "4:00 PM - 5:00 PM",
      "5:00 PM - 6:00 PM",
      "6:00 PM - 7:00 PM",
      "7:00 PM - 8:00 PM",
      "8:00 PM - 9:00 PM"
    ]
  },
  
  // Educational and Professional Background
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
  jobTitle: {
    type: String,
    trim: true
    // Not required for students/unemployed
  },
  
  // Study Plans
  examPreparation: {
    type: String,
    required: true,
    enum: [
      'MPSC', 'UPSC', 'Saral Seva', 'Railway', 'Staff Selection Commission', 
      'NOR-CET', 'Police Bharti', 'SRPF', 'CRPF', 'Army-GD', 'Army-NA',
      'SSC (10th)', 'HSC (12th)', 'JEE', 'NEET', 'MHT-CET', 'UG', 'PG', 
      'PHD', 'MCR', 'CDS', 'DMER', 'Banking', 'Any Other'
    ]
  },
  examinationDate: {
    type: Date,
    required: true
  },
  
  // Marketing and Background Information
  howDidYouKnow: {
    type: String,
    required: true,
    enum: ['Friends', 'Google', 'Facebook', 'Instagram', 'Vivek Sindhu', 'WhatsApp', 'SMS', 'Pamphlet', 'Banner / Hoarding']
  },
  previousStudyRoomExperience: {
    type: String,
    required: true,
    trim: true
  },
  studyRoomComparison: {
    type: String,
    required: true,
    trim: true
  },
  
  // Start Date
  startDate: {
    type: Date,
    required: true
  },
  
  // Tour Status
  tourStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Notes (for admin use)
  adminNotes: {
    type: String,
    trim: true
  },
  
  // Completion status
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
tourRequestSchema.index({ email: 1 });
tourRequestSchema.index({ tourDate: 1 });
tourRequestSchema.index({ tourStatus: 1 });
tourRequestSchema.index({ createdAt: 1 });

// Compound index for email and tour date (to prevent duplicate bookings on same date)
tourRequestSchema.index({ email: 1, tourDate: 1 }, { unique: true });

// Static method to check if email already has a pending/confirmed tour
tourRequestSchema.statics.hasPendingTour = async function(email) {
  const pendingTour = await this.findOne({ 
    email: email.toLowerCase(), 
    tourStatus: { $in: ['pending', 'confirmed'] }
  });
  return !!pendingTour;
};

// Static method to find tour requests by email
tourRequestSchema.statics.findByEmail = async function(email) {
  return await this.find({ email: email.toLowerCase() }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('TourRequest', tourRequestSchema);