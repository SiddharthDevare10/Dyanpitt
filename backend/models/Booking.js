const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { getCurrentIST, getISTStartOfDay } = require('../utils/istUtils');

const bookingSchema = new mongoose.Schema({
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
    required: false, // May be null if booking created before ID assignment
    index: true,
    trim: true
  },
  
  // Booking Details
  timeSlot: {
    type: String,
    enum: [
      'Day Batch (7:00 AM - 10:00 PM)',
      'Night Batch (10:00 PM - 7:00 AM)', 
      '24 Hours Batch'
    ],
    required: true,
    index: true // For analytics
  },
  
  membershipType: {
    type: String,
    enum: ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Dyanasmi Kaksh'],
    required: true,
    index: true // For analytics
  },
  
  membershipDuration: {
    type: String,
    enum: [
      '1 Day', '8 Days', '15 Days', 
      '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
      '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
    ],
    required: true,
    index: true // For analytics
  },
  
  membershipStartDate: {
    type: Date,
    required: true,
    index: true
  },
  
  membershipEndDate: {
    type: Date,
    required: true,
    index: true
  },
  
  preferredSeat: {
    type: String,
    default: ''
  },
  
  // Financial Details - IMPORTANT FOR ANALYTICS
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
    index: true // For revenue analytics
  },
  
  // Payment Details - CRUCIAL FOR ANALYTICS  
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cash_pending', 'cash_collected'],
    default: 'pending',
    index: true // CRUCIAL for payment analytics
  },
  
  paymentMethod: {
    type: String,
    enum: ['upi', 'cash', 'razorpay_upi'],
    default: 'upi',
    index: true // CRUCIAL for payment method analytics
  },
  
  paymentId: {
    type: String,
    index: true
  },
  
  transactionId: {
    type: String
  },
  
  // Razorpay-specific payment details
  razorpayOrderId: {
    type: String
  },
  
  razorpayPaymentId: {
    type: String
  },
  
  razorpaySignature: {
    type: String
  },
  
  paymentDate: {
    type: Date,
    index: true // For revenue timing analytics
  },
  
  paymentTime: {
    type: String // Store IST formatted time string
  },
  
  // Cash payment specific details
  cashPaymentRequest: {
    requestDate: Date,
    collectedDate: Date,
    collectedBy: String,
    adminNotes: String
  },
  
  // Admin tracking for payment confirmations
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  confirmedAt: {
    type: Date
  },
  
  // Status tracking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  membershipActive: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Timestamps
  bookedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes for common analytics queries
bookingSchema.index({ paymentMethod: 1, paymentStatus: 1 });
bookingSchema.index({ membershipType: 1, paymentDate: 1 });
bookingSchema.index({ paymentDate: 1, totalAmount: 1 });
bookingSchema.index({ bookedAt: 1, membershipType: 1 });
// Single field indexes for payment tracking
bookingSchema.index({ razorpayOrderId: 1 });
bookingSchema.index({ razorpayPaymentId: 1 });
bookingSchema.index({ transactionId: 1 });

// Static methods for analytics
bookingSchema.statics.getPaymentMethodDistribution = async function() {
  return this.aggregate([
    { $match: { paymentStatus: { $in: ['completed', 'cash_collected'] } } },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { count: -1 } }
  ]);
};

bookingSchema.statics.getMembershipTypeDistribution = async function() {
  return this.aggregate([
    { $group: { _id: '$membershipType', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { count: -1 } }
  ]);
};

bookingSchema.statics.getTimeSlotDistribution = async function() {
  return this.aggregate([
    { $group: { _id: '$timeSlot', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

bookingSchema.statics.getRevenueByDate = async function(startDate, endDate) {
  return this.aggregate([
    { 
      $match: { 
        paymentDate: { $gte: startDate, $lte: endDate },
        paymentStatus: { $in: ['completed', 'cash_collected'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

bookingSchema.statics.getPendingCashPayments = async function() {
  return this.find({ paymentStatus: 'cash_pending' })
    .populate('userId', 'fullName email phoneNumber dyanpittId')
    .sort({ 'cashPaymentRequest.requestDate': -1 });
};

// Get user's booking history with status classification
bookingSchema.statics.getUserBookingHistory = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const bookings = await this.find({ userId })
    .sort({ bookedAt: -1 })
    .lean();
  
  return bookings.map(booking => {
    let status = 'pending';
    let isExpired = false;
    let isCurrentlyActive = false;
    
    const startDate = new Date(booking.membershipStartDate);
    const endDate = new Date(booking.membershipEndDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Determine booking status
    if (booking.paymentStatus === 'failed') {
      status = 'failed';
    } else if (booking.paymentStatus === 'pending') {
      status = 'payment_pending';
    } else if (booking.paymentStatus === 'cash_pending') {
      status = 'cash_payment_pending';
    } else if (booking.paymentStatus === 'completed' || booking.paymentStatus === 'cash_collected') {
      // Payment completed, check membership dates
      if (today < startDate) {
        status = 'upcoming';
      } else if (today >= startDate && today <= endDate) {
        status = 'active';
        isCurrentlyActive = true;
      } else {
        status = 'expired';
        isExpired = true;
      }
    }
    
    return {
      ...booking,
      status,
      isExpired,
      isCurrentlyActive,
      daysRemaining: isCurrentlyActive ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : 0
    };
  });
};

// Get user's active bookings only
bookingSchema.statics.getUserActiveBookings = async function(userId) {
  const today = getISTStartOfDay();
  
  return this.find({
    userId,
    isActive: true,
    membershipActive: true,
    paymentStatus: { $in: ['completed', 'cash_collected'] },
    membershipStartDate: { $lte: today },
    membershipEndDate: { $gte: today }
  }).sort({ membershipEndDate: -1 });
};

// Get user's expired bookings
bookingSchema.statics.getUserExpiredBookings = async function(userId) {
  const today = getISTStartOfDay();
  
  return this.find({
    userId,
    paymentStatus: { $in: ['completed', 'cash_collected'] },
    membershipEndDate: { $lt: today }
  }).sort({ membershipEndDate: -1 });
};

// Get user's upcoming bookings (paid but not started yet)
bookingSchema.statics.getUserUpcomingBookings = async function(userId) {
  const today = getISTStartOfDay();
  
  return this.find({
    userId,
    isActive: true,
    paymentStatus: { $in: ['completed', 'cash_collected'] },
    membershipStartDate: { $gt: today }
  }).sort({ membershipStartDate: 1 });
};

// Get user's pending payments
bookingSchema.statics.getUserPendingPayments = async function(userId) {
  return this.find({
    userId,
    isActive: true,
    paymentStatus: { $in: ['pending', 'cash_pending'] }
  }).sort({ bookedAt: -1 });
};

// Update expired memberships (run as cron job)
bookingSchema.statics.updateExpiredMemberships = async function() {
  const today = getISTStartOfDay();
  
  const result = await this.updateMany(
    {
      membershipActive: true,
      membershipEndDate: { $lt: today }
    },
    {
      membershipActive: false,
      lastUpdated: getCurrentIST()
    }
  );
  
  logger.info(`Updated ${result.modifiedCount} expired memberships`);
  return result.modifiedCount;
};

module.exports = mongoose.model('Booking', bookingSchema);