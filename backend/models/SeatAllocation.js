const mongoose = require('mongoose');

const seatAllocationSchema = new mongoose.Schema({
  // References
  seatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  
  // User info for quick access
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  
  userDyanpittId: {
    type: String,
    index: true
  },
  
  // Seat allocation details
  seatNumber: {
    type: String,
    required: true,
    index: true
  },
  
  // Time and duration
  timeSlot: {
    type: String,
    enum: [
      'Day Batch (7:00 AM - 10:00 PM)',
      'Night Batch (10:00 PM - 7:00 AM)', 
      '24 Hours Batch'
    ],
    required: true,
    index: true
  },
  
  membershipType: {
    type: String,
    enum: ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Dyanasmi Kaksh'],
    required: true,
    index: true
  },
  
  membershipDuration: {
    type: String,
    enum: [
      '1 Day', '8 Days', '15 Days', 
      '1 Month', '2 Months', '3 Months', '4 Months', '5 Months', '6 Months',
      '7 Months', '8 Months', '9 Months', '10 Months', '11 Months', '12 Months'
    ],
    required: true
  },
  
  // Allocation period
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Status tracking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  allocationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Payment status (linked to booking)
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cash_pending', 'cash_collected'],
    required: true,
    index: true
  },
  
  // Allocation timestamps
  allocatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  confirmedAt: {
    type: Date,
    index: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Additional info
  notes: {
    type: String,
    default: ''
  },
  
  // Tracking changes
  allocationHistory: [{
    action: {
      type: String,
      enum: ['allocated', 'confirmed', 'activated', 'expired', 'cancelled', 'transferred']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
seatAllocationSchema.index({ seatId: 1, timeSlot: 1, startDate: 1, endDate: 1 });
seatAllocationSchema.index({ userId: 1, allocationStatus: 1 });
seatAllocationSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
seatAllocationSchema.index({ paymentStatus: 1, allocationStatus: 1 });

// Prevent double allocation of same seat for overlapping periods
seatAllocationSchema.index(
  { seatId: 1, timeSlot: 1, startDate: 1, endDate: 1, isActive: 1 },
  { 
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

// Pre-save middleware to update allocation history
seatAllocationSchema.pre('save', function(next) {
  // Update lastUpdated
  this.lastUpdated = new Date();
  
  // Track status changes
  if (this.isModified('allocationStatus')) {
    this.allocationHistory.push({
      action: this.allocationStatus,
      timestamp: new Date(),
      reason: `Status changed to ${this.allocationStatus}`
    });
    
    // Set confirmed timestamp
    if (this.allocationStatus === 'confirmed' && !this.confirmedAt) {
      this.confirmedAt = new Date();
    }
  }
  
  next();
});

// Static methods for seat allocation management

// Allocate seat to a booking
seatAllocationSchema.statics.allocateSeat = async function(bookingId, preferredSeatNumber = null) {
  const Booking = require('./Booking');
  const Seat = require('./Seat');
  
  // Get booking details
  const booking = await Booking.findById(bookingId).populate('userId');
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  const { timeSlot, membershipType, membershipStartDate, membershipEndDate, userId } = booking;
  
  // Check if allocation already exists
  const existingAllocation = await this.findOne({ bookingId, isActive: true });
  if (existingAllocation) {
    throw new Error('Seat already allocated for this booking');
  }
  
  let selectedSeat = null;
  
  // Try to allocate preferred seat if specified
  if (preferredSeatNumber) {
    const preferredSeat = await Seat.findOne({ 
      seatNumber: preferredSeatNumber,
      isActive: true,
      isMaintenanceMode: false,
      availableFor: membershipType
    });
    
    if (preferredSeat) {
      // Check if preferred seat is available
      const hasConflict = await this.findOne({
        seatId: preferredSeat._id,
        timeSlot: timeSlot,
        isActive: true,
        $or: [
          { startDate: { $gte: membershipStartDate, $lte: membershipEndDate } },
          { endDate: { $gte: membershipStartDate, $lte: membershipEndDate } },
          { startDate: { $lte: membershipStartDate }, endDate: { $gte: membershipEndDate } }
        ]
      });
      
      if (!hasConflict) {
        selectedSeat = preferredSeat;
      }
    }
  }
  
  // If no preferred seat or preferred seat unavailable, find any available seat
  if (!selectedSeat) {
    const availableSeats = await Seat.getAvailableSeats(
      membershipType, 
      timeSlot, 
      membershipStartDate, 
      membershipEndDate
    );
    
    if (availableSeats.length === 0) {
      throw new Error('No seats available for the selected time slot and period');
    }
    
    // Select best available seat (prefer Regular type, then by seat number)
    selectedSeat = availableSeats.sort((a, b) => {
      if (a.seatType === 'Regular' && b.seatType !== 'Regular') return -1;
      if (a.seatType !== 'Regular' && b.seatType === 'Regular') return 1;
      return a.seatNumber.localeCompare(b.seatNumber);
    })[0];
  }
  
  // Create seat allocation
  const allocation = new this({
    seatId: selectedSeat._id,
    userId: userId._id,
    bookingId: bookingId,
    userEmail: userId.email,
    userDyanpittId: userId.dyanpittId,
    seatNumber: selectedSeat.seatNumber,
    timeSlot: timeSlot,
    membershipType: membershipType,
    membershipDuration: booking.membershipDuration,
    startDate: membershipStartDate,
    endDate: membershipEndDate,
    paymentStatus: booking.paymentStatus,
    allocationStatus: booking.paymentStatus === 'completed' || booking.paymentStatus === 'cash_collected' 
      ? 'confirmed' : 'pending'
  });
  
  await allocation.save();
  
  // Update seat usage statistics
  await Seat.findByIdAndUpdate(selectedSeat._id, {
    $inc: { totalAllocations: 1 }
  });
  
  return allocation;
};

// Confirm allocation when payment is completed
seatAllocationSchema.statics.confirmAllocation = async function(bookingId) {
  const allocation = await this.findOne({ bookingId, isActive: true });
  
  if (!allocation) {
    throw new Error('Seat allocation not found');
  }
  
  allocation.allocationStatus = 'confirmed';
  allocation.paymentStatus = 'completed';
  
  await allocation.save();
  return allocation;
};

// Activate allocation when membership period starts
seatAllocationSchema.statics.activateExpiredAllocations = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Activate allocations that start today
  const activatedCount = await this.updateMany(
    {
      allocationStatus: 'confirmed',
      startDate: { $lte: today },
      endDate: { $gte: today },
      paymentStatus: { $in: ['completed', 'cash_collected'] }
    },
    {
      allocationStatus: 'active',
      lastUpdated: new Date()
    }
  );
  
  // Expire allocations that ended yesterday or before
  const expiredCount = await this.updateMany(
    {
      allocationStatus: 'active',
      endDate: { $lt: today }
    },
    {
      allocationStatus: 'expired',
      isActive: false,
      lastUpdated: new Date()
    }
  );
  
  console.log(`Seat allocations: ${activatedCount.modifiedCount} activated, ${expiredCount.modifiedCount} expired`);
  
  return {
    activated: activatedCount.modifiedCount,
    expired: expiredCount.modifiedCount
  };
};

// Get user's current seat allocations
seatAllocationSchema.statics.getUserCurrentAllocations = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    userId: userId,
    isActive: true,
    allocationStatus: { $in: ['confirmed', 'active'] },
    startDate: { $lte: today },
    endDate: { $gte: today }
  })
  .populate('seatId', 'seatNumber row column seatType features')
  .sort({ startDate: 1 });
};

// Get allocation history for a user
seatAllocationSchema.statics.getUserAllocationHistory = async function(userId, limit = 20) {
  return this.find({ userId })
    .populate('seatId', 'seatNumber row column seatType')
    .sort({ allocatedAt: -1 })
    .limit(limit);
};

// Cancel allocation (when booking is cancelled)
seatAllocationSchema.statics.cancelAllocation = async function(bookingId, reason = 'Booking cancelled') {
  const allocation = await this.findOne({ bookingId, isActive: true });
  
  if (!allocation) {
    return null;
  }
  
  allocation.allocationStatus = 'cancelled';
  allocation.isActive = false;
  allocation.allocationHistory.push({
    action: 'cancelled',
    timestamp: new Date(),
    reason: reason
  });
  
  await allocation.save();
  return allocation;
};

// Get seat occupancy statistics
seatAllocationSchema.statics.getOccupancyStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        isActive: true,
        allocationStatus: { $in: ['confirmed', 'active'] },
        $or: [
          { startDate: { $gte: startDate, $lte: endDate } },
          { endDate: { $gte: startDate, $lte: endDate } },
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
        ]
      }
    },
    {
      $group: {
        _id: {
          timeSlot: '$timeSlot',
          membershipType: '$membershipType'
        },
        totalAllocations: { $sum: 1 },
        uniqueSeats: { $addToSet: '$seatId' }
      }
    },
    {
      $project: {
        timeSlot: '$_id.timeSlot',
        membershipType: '$_id.membershipType',
        totalAllocations: 1,
        uniqueSeatsCount: { $size: '$uniqueSeats' }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('SeatAllocation', seatAllocationSchema);