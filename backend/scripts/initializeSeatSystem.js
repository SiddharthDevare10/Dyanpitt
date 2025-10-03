/**
 * Initialization script for the complete seat allocation system
 * Run this script to set up seats and test the allocation system
 */

const mongoose = require('mongoose');
const Seat = require('../models/Seat');
const SeatAllocation = require('../models/SeatAllocation');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function initializeSeatSystem() {
  try {
    console.log('🎯 Initializing Seat Allocation System...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dyanpitt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('📡 Connected to database');
    
    // 1. Initialize default seats
    console.log('\n📍 Step 1: Initializing seat layout...');
    const seatsCreated = await Seat.initializeDefaultSeats();
    
    if (seatsCreated === 0) {
      console.log('   ✅ Seats already initialized');
    } else {
      console.log(`   ✅ Created ${seatsCreated} seats`);
    }
    
    // 2. Display seat layout
    console.log('\n📍 Step 2: Verifying seat layout...');
    const layout = await Seat.getSeatLayout();
    
    Object.entries(layout).forEach(([row, seats]) => {
      const seatNumbers = seats.map(s => s.seatNumber).join(', ');
      console.log(`   Row ${row}: ${seats.length} seats (${seatNumbers})`);
    });
    
    // 3. Check existing bookings and allocations
    console.log('\n📍 Step 3: Checking existing data...');
    
    const totalBookings = await Booking.countDocuments();
    const totalAllocations = await SeatAllocation.countDocuments();
    const activeAllocations = await SeatAllocation.countDocuments({ isActive: true });
    
    console.log(`   📋 Total bookings: ${totalBookings}`);
    console.log(`   🪑 Total allocations: ${totalAllocations} (${activeAllocations} active)`);
    
    // 4. Auto-allocate seats for bookings without allocations
    console.log('\n📍 Step 4: Auto-allocating seats for existing bookings...');
    
    const bookingsWithoutSeats = await Booking.find({
      paymentStatus: { $in: ['completed', 'cash_collected', 'pending', 'cash_pending'] },
      isActive: true
    });
    
    let allocatedCount = 0;
    let failedCount = 0;
    
    for (const booking of bookingsWithoutSeats) {
      // Check if allocation already exists
      const existingAllocation = await SeatAllocation.findOne({
        bookingId: booking._id,
        isActive: true
      });
      
      if (!existingAllocation) {
        try {
          const allocation = await SeatAllocation.allocateSeat(booking._id);
          console.log(`     ✅ Allocated seat ${allocation.seatNumber} for booking ${booking._id}`);
          allocatedCount++;
        } catch (error) {
          console.log(`     ❌ Failed to allocate seat for booking ${booking._id}: ${error.message}`);
          failedCount++;
        }
      }
    }
    
    console.log(`   📊 Auto-allocation complete: ${allocatedCount} allocated, ${failedCount} failed`);
    
    // 5. Test seat availability queries
    console.log('\n📍 Step 5: Testing seat availability...');
    
    const testQueries = [
      {
        membershipType: 'Dyandhara Kaksh',
        timeSlot: 'Day Batch (7:00 AM - 10:00 PM)',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        membershipType: 'Dyanpurn Kaksh',
        timeSlot: '24 Hours Batch',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ];
    
    for (const query of testQueries) {
      const availableSeats = await Seat.getAvailableSeats(
        query.membershipType,
        query.timeSlot,
        query.startDate,
        query.endDate
      );
      
      console.log(`   🔍 ${query.membershipType} - ${query.timeSlot}: ${availableSeats.length} available seats`);
    }
    
    // 6. Display system statistics
    console.log('\n📍 Step 6: System statistics...');
    
    const stats = await generateSystemStats();
    console.log(`   🏢 Total seats: ${stats.totalSeats}`);
    console.log(`   ✅ Active seats: ${stats.activeSeats}`);
    console.log(`   🔧 Maintenance mode: ${stats.maintenanceSeats}`);
    console.log(`   📊 Seat types: ${JSON.stringify(stats.seatTypes)}`);
    console.log(`   🎯 Current occupancy: ${stats.occupiedSeats}/${stats.totalSeats} (${stats.occupancyRate}%)`);
    
    // 7. Set up indexes (if not already created)
    console.log('\n📍 Step 7: Ensuring database indexes...');
    
    try {
      await Seat.collection.createIndexes();
      await SeatAllocation.collection.createIndexes();
      console.log('   ✅ Database indexes verified');
    } catch (error) {
      console.log('   ⚠️ Index creation warning:', error.message);
    }
    
    console.log('\n🎉 Seat Allocation System initialization complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test seat selection in the frontend');
    console.log('   2. Verify automatic seat allocation during booking');
    console.log('   3. Check seat occupancy in admin dashboard');
    console.log('   4. Set up cron jobs for membership/seat status updates');
    
    return {
      seatsCreated,
      allocatedCount,
      failedCount,
      stats
    };
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

async function generateSystemStats() {
  const totalSeats = await Seat.countDocuments();
  const activeSeats = await Seat.countDocuments({ isActive: true });
  const maintenanceSeats = await Seat.countDocuments({ isMaintenanceMode: true });
  
  const seatTypes = await Seat.aggregate([
    { $group: { _id: '$seatType', count: { $sum: 1 } } }
  ]);
  
  const today = new Date();
  const occupiedSeats = await SeatAllocation.countDocuments({
    isActive: true,
    allocationStatus: { $in: ['confirmed', 'active'] },
    startDate: { $lte: today },
    endDate: { $gte: today }
  });
  
  const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  
  return {
    totalSeats,
    activeSeats,
    maintenanceSeats,
    seatTypes: Object.fromEntries(seatTypes.map(s => [s._id, s.count])),
    occupiedSeats,
    occupancyRate
  };
}

// Run initialization if called directly
if (require.main === module) {
  // Connect to database directly
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dyanpitt', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    return initializeSeatSystem();
  }).then((result) => {
    console.log('\n✅ Initialization completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  });
}

module.exports = { initializeSeatSystem, generateSystemStats };