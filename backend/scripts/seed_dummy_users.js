// Seed 10 dummy users: 5 via tour, 5 direct sign-in
// Load env first so connectDB can see MONGODB_URI
require('dotenv').config();

// Fallback for local dev if MONGODB_URI not provided
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/dyanpittapp';
  console.log('ℹ️ MONGODB_URI not set, using fallback:', process.env.MONGODB_URI);
}

const connectDB = require('../config/database');
const User = require('../models/User');
const TourRequest = require('../models/TourRequest');
const Booking = require('../models/Booking');
const { getCurrentIST } = require('../utils/istUtils');

const run = async () => {
  // Prepare data (define first so we can cleanup by email)
  const tourUsers = [1,2,3,4,5].map(i => ({
    email: `touruser${i}@example.com`,
    fullName: `Tour User ${i}`,
    phoneNumber: `90000000${10+i}`,
    gender: i % 2 ? 'male' : 'female',
  }));

  const directUsers = [1,2,3,4,5].map(i => ({
    email: `directuser${i}@example.com`,
    fullName: `Direct User ${i}`,
    phoneNumber: `80000000${10+i}`,
    gender: i % 2 ? 'female' : 'male',
  }));

  await connectDB();
  console.log('Connected to DB');

  // Cleanup existing dummy data to avoid duplicates
  const emails = [...tourUsers, ...directUsers].map(u => u.email);
  await Promise.all([
    User.deleteMany({ email: { $in: emails } }),
    TourRequest.deleteMany({ email: { $in: emails } }),
    Booking.deleteMany({ userEmail: { $in: emails } })
  ]);
  console.log('Cleaned previous dummy records');

  // Helper creators
  const createUser = async (u) => {
    const user = new User({
      email: u.email,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      dateOfBirth: u.dateOfBirth || '2000-01-01',
      gender: u.gender || 'male',
      currentAddress: u.currentAddress || 'Test Address',
      password: u.password || 'Password@123',
      isEmailVerified: true,
      profileCompleted: true,
      membershipCompleted: !!u.membership,
      bookingCompleted: !!u.membership,
      role: 'user',
    });
    await user.save();
    return user;
  };

  const createTour = async (t, user = null) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 60);

    const tour = new TourRequest({
      email: t.email,
      userId: user ? user._id : null,
      dyanpittId: user && user.dyanpittId ? user.dyanpittId : null,
      fullName: t.fullName,
      phoneNumber: t.phoneNumber,
      gender: t.gender || 'male',
      tourDate: tomorrow,
      tourTime: '10:00 AM - 11:00 AM',
      educationalBackground: 'Graduation',
      currentOccupation: 'Student',
      jobTitle: null,
      examPreparation: 'MPSC',
      examinationDate: examDate,
      howDidYouKnow: 'Google',
      previousStudyRoomExperience: 'None',
      studyRoomComparison: 'N/A',
      startDate: tomorrow,
      tourStatus: 'completed',
      isCompleted: true,
    });
    await tour.save();
    return tour;
  };

  const createBooking = async (user, opts = {}) => {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const booking = new Booking({
      userId: user._id,
      userEmail: user.email,
      dyanpittId: user.dyanpittId || null,
      timeSlot: opts.timeSlot || 'Day Batch (7:00 AM - 10:00 PM)',
      membershipType: opts.membershipType || 'Dyandhara Kaksh',
      membershipDuration: opts.membershipDuration || '1 Month',
      membershipStartDate: start,
      membershipEndDate: end,
      membershipActive: true,
      isActive: true,
      paymentStatus: 'completed',
      paymentMethod: 'upi',
      paymentId: `PAY_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      bookedAt: getCurrentIST(),
      preferredSeat: opts.preferredSeat || 'A1',
      totalAmount: opts.totalAmount || 1500,
    });
    await booking.save();
    // Mark user flags
    user.membershipCompleted = true;
    user.bookingCompleted = true;
    await user.save();
    return booking;
  };

  try {
    // Create 5 users from tour
    for (let i = 0; i < tourUsers.length; i++) {
      const tu = tourUsers[i];
      const user = await createUser({ ...tu, membership: i < 3 });
      await createTour(tu, user);
      if (i < 3) await createBooking(user, { preferredSeat: `B${i+1}` });
    }

    // Create 5 users direct sign-in (no tour)
    for (let i = 0; i < directUsers.length; i++) {
      const du = directUsers[i];
      const user = await createUser({ ...du, membership: i < 2 });
      if (i < 2) await createBooking(user, { preferredSeat: `C${i+1}` });
    }

    console.log('✅ Seeded 10 users (5 tour, 5 direct).');
  } catch (e) {
    console.error('Seeding failed:', e);
  } finally {
    process.exit(0);
  }
};

run();
