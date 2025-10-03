/**
 * Migration script to add dyanpittId to existing Booking and Membership records
 * Run this once after adding the dyanpittId field to the models
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Membership = require('../models/Membership');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dyanpitt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const migrateDyanpittIds = async () => {
  console.log('🚀 Starting migration to add dyanpittId to existing records...');
  
  try {
    // Get all users who have dyanpittId
    const usersWithIds = await User.find({ 
      hasDnyanpittId: true, 
      dyanpittId: { $exists: true, $ne: null } 
    }).select('_id email dyanpittId');
    
    console.log(`📊 Found ${usersWithIds.length} users with Dyanpeeth IDs`);
    
    let bookingsUpdated = 0;
    let membershipsUpdated = 0;
    
    // Update bookings
    for (const user of usersWithIds) {
      const bookingResult = await Booking.updateMany(
        { 
          userId: user._id,
          $or: [
            { dyanpittId: { $exists: false } },
            { dyanpittId: null },
            { dyanpittId: '' }
          ]
        },
        { 
          $set: { dyanpittId: user.dyanpittId } 
        }
      );
      
      bookingsUpdated += bookingResult.modifiedCount;
      
      const membershipResult = await Membership.updateMany(
        { 
          userId: user._id,
          $or: [
            { dyanpittId: { $exists: false } },
            { dyanpittId: null },
            { dyanpittId: '' }
          ]
        },
        { 
          $set: { dyanpittId: user.dyanpittId } 
        }
      );
      
      membershipsUpdated += membershipResult.modifiedCount;
    }
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📈 Updated ${bookingsUpdated} booking records`);
    console.log(`📈 Updated ${membershipsUpdated} membership records`);
    
    // Verify the migration
    const bookingsWithoutId = await Booking.countDocuments({
      $or: [
        { dyanpittId: { $exists: false } },
        { dyanpittId: null },
        { dyanpittId: '' }
      ]
    });
    
    const membershipsWithoutId = await Membership.countDocuments({
      $or: [
        { dyanpittId: { $exists: false } },
        { dyanpittId: null },
        { dyanpittId: '' }
      ]
    });
    
    console.log(`📊 Verification:`);
    console.log(`   - Bookings without dyanpittId: ${bookingsWithoutId}`);
    console.log(`   - Memberships without dyanpittId: ${membershipsWithoutId}`);
    
    if (bookingsWithoutId > 0 || membershipsWithoutId > 0) {
      console.log(`⚠️  Note: Some records still don't have dyanpittId - these may be from users who haven't been assigned IDs yet`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await migrateDyanpittIds();
    console.log('🎉 Migration script completed successfully!');
  } catch (error) {
    console.error('💥 Migration script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);
  }
};

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { migrateDyanpittIds };