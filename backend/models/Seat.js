const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  // Seat identification
  seatNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Physical location in the study room
  row: {
    type: String,
    required: true,
    index: true // e.g., 'A', 'B', 'C'
  },
  
  column: {
    type: Number,
    required: true,
    index: true // e.g., 1, 2, 3, 4
  },
  
  // Seat type and features
  seatType: {
    type: String,
    enum: ['Regular', 'Premium', 'Window', 'Corner', 'Accessible'],
    default: 'Regular',
    index: true
  },
  
  // Features available at this seat
  features: [{
    type: String,
    enum: ['Power Outlet', 'Reading Light', 'Storage Drawer', 'Adjustable Chair', 'Desktop Extension']
  }],
  
  // Membership type compatibility
  availableFor: [{
    type: String,
    enum: ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Dyanasmi Kaksh'],
    required: true
  }],
  
  // Time slot availability
  timeSlotAvailability: [{
    timeSlot: {
      type: String,
      enum: [
        'Day Batch (7:00 AM - 10:00 PM)',
        'Night Batch (10:00 PM - 7:00 AM)', 
        '24 Hours Batch'
      ],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  
  // Seat status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isMaintenanceMode: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Maintenance and notes
  maintenanceNotes: {
    type: String,
    default: ''
  },
  
  lastMaintenanceDate: {
    type: Date
  },
  
  // Usage statistics
  totalAllocations: {
    type: Number,
    default: 0
  },
  
  // Creation and updates
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
seatSchema.index({ row: 1, column: 1 });
seatSchema.index({ seatType: 1, isActive: 1 });
seatSchema.index({ 'availableFor': 1, 'timeSlotAvailability.timeSlot': 1 });

// Static methods for seat management
seatSchema.statics.getAvailableSeats = async function(membershipType, timeSlot, startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all seats that support this membership type and time slot
  const compatibleSeats = await this.find({
    isActive: true,
    isMaintenanceMode: false,
    availableFor: membershipType,
    'timeSlotAvailability': {
      $elemMatch: {
        timeSlot: timeSlot,
        isAvailable: true
      }
    }
  });
  
  // Check each seat's allocation status for the requested period
  const SeatAllocation = require('./SeatAllocation');
  const availableSeats = [];
  
  for (const seat of compatibleSeats) {
    const hasConflict = await SeatAllocation.findOne({
      seatId: seat._id,
      timeSlot: timeSlot,
      isActive: true,
      $or: [
        // Existing allocation starts within requested period
        {
          startDate: { $gte: startDate, $lte: endDate }
        },
        // Existing allocation ends within requested period
        {
          endDate: { $gte: startDate, $lte: endDate }
        },
        // Existing allocation completely encompasses requested period
        {
          startDate: { $lte: startDate },
          endDate: { $gte: endDate }
        }
      ]
    });
    
    if (!hasConflict) {
      availableSeats.push({
        ...seat.toObject(),
        isPreferred: false // Will be set based on user preference
      });
    }
  }
  
  return availableSeats;
};

// Get seat occupancy for a specific date range
seatSchema.statics.getSeatOccupancy = async function(startDate, endDate, timeSlot = null) {
  const SeatAllocation = require('./SeatAllocation');
  
  const matchConditions = {
    isActive: true,
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  };
  
  if (timeSlot) {
    matchConditions.timeSlot = timeSlot;
  }
  
  const occupancy = await SeatAllocation.aggregate([
    { $match: matchConditions },
    {
      $lookup: {
        from: 'seats',
        localField: 'seatId',
        foreignField: '_id',
        as: 'seat'
      }
    },
    { $unwind: '$seat' },
    {
      $group: {
        _id: {
          seatId: '$seatId',
          timeSlot: '$timeSlot'
        },
        seatNumber: { $first: '$seat.seatNumber' },
        seatType: { $first: '$seat.seatType' },
        allocations: { $push: '$$ROOT' }
      }
    }
  ]);
  
  return occupancy;
};

// Initialize default seats for the study room
seatSchema.statics.initializeDefaultSeats = async function() {
  const existingSeats = await this.countDocuments();
  
  if (existingSeats > 0) {
    console.log(`Seats already initialized (${existingSeats} seats found)`);
    return;
  }
  
  console.log('Initializing default seat layout...');
  
  const rows = ['A', 'B', 'C', 'D', 'E']; // 5 rows
  const seatsPerRow = 8; // 8 seats per row
  const timeSlots = [
    'Day Batch (7:00 AM - 10:00 PM)',
    'Night Batch (10:00 PM - 7:00 AM)', 
    '24 Hours Batch'
  ];
  
  const seats = [];
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    
    for (let col = 1; col <= seatsPerRow; col++) {
      const seatNumber = `${row}${col.toString().padStart(2, '0')}`;
      
      // Determine seat type based on position
      let seatType = 'Regular';
      if (col === 1 || col === seatsPerRow) seatType = 'Window';
      if (rowIndex === 0 || rowIndex === rows.length - 1) {
        if (col === 1 || col === seatsPerRow) seatType = 'Corner';
      }
      if (rowIndex === 0 && col <= 2) seatType = 'Premium'; // Front row premium seats
      
      // Features based on seat type
      let features = ['Power Outlet'];
      if (seatType === 'Premium') features.push('Reading Light', 'Adjustable Chair');
      if (seatType === 'Window') features.push('Reading Light');
      if (col % 2 === 0) features.push('Storage Drawer');
      
      // All seats available for all membership types initially
      const availableFor = ['Dyandhara Kaksh', 'Dyanpurn Kaksh', 'Dyanasmi Kaksh'];
      
      // Time slot availability
      const timeSlotAvailability = timeSlots.map(slot => ({
        timeSlot: slot,
        isAvailable: true
      }));
      
      seats.push({
        seatNumber,
        row,
        column: col,
        seatType,
        features,
        availableFor,
        timeSlotAvailability,
        isActive: true,
        isMaintenanceMode: false,
        totalAllocations: 0
      });
    }
  }
  
  await this.insertMany(seats);
  console.log(`✅ Initialized ${seats.length} seats (${rows.length} rows × ${seatsPerRow} seats)`);
  
  return seats.length;
};

// Get seat layout for display
seatSchema.statics.getSeatLayout = async function(membershipType = null, timeSlot = null, startDate = null, endDate = null) {
  let query = { isActive: true };
  
  if (membershipType) {
    query.availableFor = membershipType;
  }
  
  const seats = await this.find(query).sort({ row: 1, column: 1 });
  
  // Group by rows
  const layout = {};
  const SeatAllocation = require('./SeatAllocation');
  
  for (const seat of seats) {
    if (!layout[seat.row]) {
      layout[seat.row] = [];
    }
    
    let isOccupied = false;
    let occupiedBy = null;
    
    // Check if seat is occupied during requested period
    if (timeSlot && startDate && endDate) {
      const allocation = await SeatAllocation.findOne({
        seatId: seat._id,
        timeSlot: timeSlot,
        isActive: true,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }).populate('userId', 'fullName dyanpittId');
      
      if (allocation) {
        isOccupied = true;
        occupiedBy = {
          userName: allocation.userId?.fullName,
          userDyanpittId: allocation.userId?.dyanpittId,
          endDate: allocation.endDate
        };
      }
    }
    
    layout[seat.row].push({
      ...seat.toObject(),
      isOccupied,
      occupiedBy
    });
  }
  
  return layout;
};

module.exports = mongoose.model('Seat', seatSchema);