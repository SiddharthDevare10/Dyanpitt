const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  
  // Time slot selection
  timeSlot: {
    type: String,
    required: true,
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
    required: true,
    enum: ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Calista Garden']
  },
  
  // Membership duration
  membershipDuration: {
    type: String,
    required: true,
    enum: [
      '1 Day', '8 Days', '15 Days', 
      '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
      '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
    ]
  },
  
  // Membership start date (within 30 days)
  membershipStartDate: {
    type: Date,
    required: true,
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
    type: String,
    required: true
  },
  
  // Calculated fields
  membershipEndDate: {
    type: Date,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Fee breakdown and pricing details
  feeBreakdown: {
    basePrice: {
      type: Number,
      required: true
    },
    seatTier: {
      type: String,
      enum: ['standard', 'silver', 'gold'],
      default: 'standard'
    },
    seatTierSurcharge: {
      type: Number,
      default: 0
    },
    discounts: {
      femaleDiscount: {
        type: Number,
        default: 0
      },
      durationDiscount: {
        type: Number,
        default: 0
      },
      totalDiscountPercentage: {
        type: Number,
        default: 0
      },
      totalDiscountAmount: {
        type: Number,
        default: 0
      }
    },
    registrationFee: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    }
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
  },
  
  // Booking status
  bookingStatus: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
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
bookingSchema.index({ email: 1 }, { unique: true }); // Ensure one booking per email
bookingSchema.index({ dyanpittId: 1 }, { sparse: true }); // Sparse index for optional dyanpittId
bookingSchema.index({ userId: 1 });
bookingSchema.index({ membershipStartDate: 1 });
bookingSchema.index({ membershipEndDate: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ bookingStatus: 1 });

// Calculate membership end date before saving
bookingSchema.pre('save', function(next) {
  if (this.isModified('membershipStartDate') || this.isModified('membershipDuration')) {
    const startDate = new Date(this.membershipStartDate);
    const duration = this.membershipDuration;
    
    let endDate = new Date(startDate);
    
    // Calculate end date based on duration
    if (duration === '1 Day') {
      endDate.setDate(endDate.getDate() + 1);
    } else if (duration === '8 Days') {
      endDate.setDate(endDate.getDate() + 8);
    } else if (duration === '15 Days') {
      endDate.setDate(endDate.getDate() + 15);
    } else if (duration.includes('Month')) {
      const months = parseInt(duration.split(' ')[0]);
      endDate.setMonth(endDate.getMonth() + months);
    }
    
    this.membershipEndDate = endDate;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);