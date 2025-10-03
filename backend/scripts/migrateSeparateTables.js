/**
 * Migration script to move embedded membership and booking data from User table 
 * to separate Membership and Booking tables
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Booking = require('../models/Booking');

async function migrateSeparateTables() {
  try {
    console.log('🔄 Starting migration to separate tables...');
    
    // Find all users with embedded membership or booking data
    const usersWithEmbeddedData = await User.find({
      $or: [
        { 'membership.submittedAt': { $exists: true } },
        { 'bookings.0': { $exists: true } }
      ]
    });
    
    console.log(`📊 Found ${usersWithEmbeddedData.length} users with embedded data`);
    
    let membershipsMigrated = 0;
    let bookingsMigrated = 0;
    
    for (const user of usersWithEmbeddedData) {
      console.log(`👤 Processing user: ${user.email}`);
      
      // Migrate membership data if exists
      if (user.membership && user.membership.submittedAt) {
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
            submittedAt: user.membership.submittedAt,
            notes: user.membership.notes || ''
          };
          
          await Membership.create(membershipData);
          membershipsMigrated++;
          console.log(`  ✅ Migrated membership data`);
        } else {
          console.log(`  ⚠️ Membership already exists in separate table`);
        }
      }
      
      // Migrate booking data if exists
      if (user.bookings && user.bookings.length > 0) {
        for (const embeddedBooking of user.bookings) {
          const existingBooking = await Booking.findOne({ 
            userId: user._id, 
            bookedAt: embeddedBooking.bookedAt 
          });
          
          if (!existingBooking) {
            const bookingData = {
              userId: user._id,
              userEmail: user.email,
              timeSlot: embeddedBooking.timeSlot,
              membershipType: embeddedBooking.membershipType,
              membershipDuration: embeddedBooking.membershipDuration,
              membershipStartDate: embeddedBooking.membershipStartDate,
              membershipEndDate: embeddedBooking.membershipEndDate,
              preferredSeat: embeddedBooking.preferredSeat || '',
              totalAmount: embeddedBooking.totalAmount,
              paymentStatus: embeddedBooking.paymentStatus || 'pending',
              paymentMethod: embeddedBooking.paymentMethod || 'upi',
              paymentId: embeddedBooking.paymentId,
              paymentDate: embeddedBooking.paymentDate,
              cashPaymentRequest: embeddedBooking.cashPaymentRequest,
              isActive: embeddedBooking.isActive !== false, // default to true
              membershipActive: embeddedBooking.membershipActive || false,
              bookedAt: embeddedBooking.bookedAt,
              lastUpdated: embeddedBooking.lastUpdated || new Date(),
              notes: embeddedBooking.notes || ''
            };
            
            await Booking.create(bookingData);
            bookingsMigrated++;
            console.log(`  ✅ Migrated booking data (${embeddedBooking.membershipType})`);
          } else {
            console.log(`  ⚠️ Booking already exists in separate table`);
          }
        }
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Memberships migrated: ${membershipsMigrated}`);
    console.log(`📊 Bookings migrated: ${bookingsMigrated}`);
    
    // Optional: Clean up embedded data from User table
    console.log(`\n❓ Would you like to clean up embedded data from User table?`);
    console.log(`   This will remove the 'membership' and 'bookings' fields from User documents.`);
    console.log(`   Run with --cleanup flag to perform cleanup.`);
    
    if (process.argv.includes('--cleanup')) {
      console.log(`🧹 Cleaning up embedded data...`);
      
      const cleanupResult = await User.updateMany(
        {},
        { 
          $unset: { 
            membership: "", 
            bookings: "" 
          } 
        }
      );
      
      console.log(`✅ Cleaned up ${cleanupResult.modifiedCount} user documents`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const { connectDB } = require('../config/database');
  
  connectDB().then(() => {
    return migrateSeparateTables();
  }).then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateSeparateTables };