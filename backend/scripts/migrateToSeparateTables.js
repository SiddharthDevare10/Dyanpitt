const mongoose = require('mongoose');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Booking = require('../models/Booking');
require('dotenv').config();

async function migrateToSeparateTables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnyanpeeth');
    console.log('✅ Connected to MongoDB');

    // Find users with membership or booking data
    const users = await User.find({
      $or: [
        { 'membership': { $exists: true } },
        { 'bookings.0': { $exists: true } }
      ]
    });

    console.log(`📋 Found ${users.length} users with membership/booking data`);

    let membershipsMigrated = 0;
    let bookingsMigrated = 0;

    for (const user of users) {
      console.log(`\n🔄 Processing user: ${user.email}`);

      // Migrate membership data - only if complete
      if (user.membership && Object.keys(user.membership).length > 0) {
        // Check if membership data is complete
        const requiredFields = ['visitedBefore', 'educationalBackground', 'currentOccupation', 'fatherName', 'parentContactNumber', 'examPreparation', 'examinationDate'];
        const hasAllRequiredFields = requiredFields.every(field => user.membership[field]);
        
        if (hasAllRequiredFields) {
          const existingMembership = await Membership.findOne({ userId: user._id });
          
          if (!existingMembership) {
            const membershipData = {
              userId: user._id,
              userEmail: user.email,
              visitedBefore: user.membership.visitedBefore,
              educationalBackground: user.membership.educationalBackground,
              currentOccupation: user.membership.currentOccupation,
              jobTitle: user.membership.jobTitle || '',
              fatherName: user.membership.fatherName,
              parentContactNumber: user.membership.parentContactNumber,
              examPreparation: user.membership.examPreparation,
              examinationDate: user.membership.examinationDate,
              selfiePhotoUrl: user.membership.selfiePhotoUrl,
              selfiePhotoThumbnail: user.membership.selfiePhotoThumbnail,
              submittedAt: user.membership.submittedAt || user.createdAt,
              notes: user.membership.notes || ''
            };

            const newMembership = new Membership(membershipData);
            await newMembership.save();
            membershipsMigrated++;
            console.log(`  ✅ Migrated membership for ${user.email}`);
          } else {
            console.log(`  ℹ️  Membership already exists for ${user.email}`);
          }
        } else {
          console.log(`  ⚠️  Skipping incomplete membership data for ${user.email}`);
        }
      }

      // Migrate booking data
      if (user.bookings && user.bookings.length > 0) {
        for (const bookingData of user.bookings) {
          const existingBooking = await Booking.findOne({ 
            userId: user._id, 
            bookedAt: bookingData.bookedAt 
          });

          if (!existingBooking) {
            const newBookingData = {
              userId: user._id,
              userEmail: user.email,
              timeSlot: bookingData.timeSlot,
              membershipType: bookingData.membershipType,
              membershipDuration: bookingData.membershipDuration,
              membershipStartDate: bookingData.membershipStartDate,
              membershipEndDate: bookingData.membershipEndDate,
              preferredSeat: bookingData.preferredSeat || '',
              totalAmount: bookingData.totalAmount,
              paymentStatus: bookingData.paymentStatus || 'pending',
              paymentMethod: bookingData.paymentMethod || 'upi',
              paymentId: bookingData.paymentId,
              paymentDate: bookingData.paymentDate,
              cashPaymentRequest: bookingData.cashPaymentRequest,
              isActive: bookingData.isActive !== false,
              membershipActive: bookingData.membershipActive || false,
              bookedAt: bookingData.bookedAt,
              lastUpdated: bookingData.lastUpdated || bookingData.bookedAt,
              notes: bookingData.notes || ''
            };

            const newBooking = new Booking(newBookingData);
            await newBooking.save();
            bookingsMigrated++;
            console.log(`  ✅ Migrated booking for ${user.email} - ${bookingData.membershipType}`);
          } else {
            console.log(`  ℹ️  Booking already exists for ${user.email}`);
          }
        }
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Summary:`);
    console.log(`  - Memberships migrated: ${membershipsMigrated}`);
    console.log(`  - Bookings migrated: ${bookingsMigrated}`);
    console.log(`  - Total users processed: ${users.length}`);

    // Test analytics
    console.log(`\n📈 Testing Analytics:`);
    
    const examDistribution = await Membership.getExamDistribution();
    console.log('📚 Exam Distribution:', examDistribution);

    const paymentMethodDistribution = await Booking.getPaymentMethodDistribution();
    console.log('💳 Payment Method Distribution:', paymentMethodDistribution);

    const membershipTypeDistribution = await Booking.getMembershipTypeDistribution();
    console.log('🏢 Membership Type Distribution:', membershipTypeDistribution);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
migrateToSeparateTables();