const logger = require('../utils/logger');
const express = require('express');
const Booking = require('../models/Booking');
const { authenticateToken: auth } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// Get user's complete booking history
router.get('/history', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get comprehensive booking history with status classification
    const bookingHistory = await Booking.getUserBookingHistory(userId);
    
    // Categorize bookings for easier frontend handling
    const categorized = {
      active: bookingHistory.filter(b => b.status === 'active'),
      upcoming: bookingHistory.filter(b => b.status === 'upcoming'),
      expired: bookingHistory.filter(b => b.status === 'expired'),
      pending: bookingHistory.filter(b => b.status === 'payment_pending'),
      cashPending: bookingHistory.filter(b => b.status === 'cash_payment_pending'),
      failed: bookingHistory.filter(b => b.status === 'failed')
    };
    
    // Calculate summary statistics
    const summary = {
      totalBookings: bookingHistory.length,
      activeBookings: categorized.active.length,
      totalSpent: bookingHistory
        .filter(b => b.paymentStatus === 'completed' || b.paymentStatus === 'cash_collected')
        .reduce((sum, b) => sum + b.totalAmount, 0),
      longestMembership: Math.max(
        ...bookingHistory
          .filter(b => b.membershipStartDate && b.membershipEndDate)
          .map(b => {
            const start = new Date(b.membershipStartDate);
            const end = new Date(b.membershipEndDate);
            return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          }),
        0
      )
    };
    
    res.json({
      success: true,
      data: {
        history: bookingHistory,
        categorized,
        summary
      }
    });
    
  } catch (error) {
    logger.error('Get booking history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking history'
    });
  }
});

// Get user's active bookings only
router.get('/active', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    const activeBookings = await Booking.getUserActiveBookings(userId);
    
    // Add days remaining calculation
    const today = new Date();
    const enrichedBookings = activeBookings.map(booking => {
      const endDate = new Date(booking.membershipEndDate);
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      return {
        ...booking.toObject(),
        daysRemaining: Math.max(0, daysRemaining),
        isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0
      };
    });
    
    res.json({
      success: true,
      data: enrichedBookings
    });
    
  } catch (error) {
    logger.error('Get active bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active bookings'
    });
  }
});

// Get user's expired bookings (past memberships)
router.get('/expired', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const expiredBookings = await Booking.getUserExpiredBookings(userId);
    
    // Add duration calculation for each expired booking
    const enrichedBookings = expiredBookings.map(booking => {
      const startDate = new Date(booking.membershipStartDate);
      const endDate = new Date(booking.membershipEndDate);
      const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...booking.toObject(),
        durationDays,
        wasActive: true // All expired bookings were previously active
      };
    });
    
    // Pagination
    const paginatedBookings = enrichedBookings.slice(skip, skip + limit);
    const totalPages = Math.ceil(enrichedBookings.length / limit);
    
    res.json({
      success: true,
      data: {
        bookings: paginatedBookings,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: enrichedBookings.length,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    logger.error('Get expired bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expired bookings'
    });
  }
});

// Get user's upcoming bookings
router.get('/upcoming', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    const upcomingBookings = await Booking.getUserUpcomingBookings(userId);
    
    // Add days until start calculation
    const today = new Date();
    const enrichedBookings = upcomingBookings.map(booking => {
      const startDate = new Date(booking.membershipStartDate);
      const daysUntilStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      
      return {
        ...booking.toObject(),
        daysUntilStart: Math.max(0, daysUntilStart),
        startsSoon: daysUntilStart <= 3 && daysUntilStart > 0
      };
    });
    
    res.json({
      success: true,
      data: enrichedBookings
    });
    
  } catch (error) {
    logger.error('Get upcoming bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming bookings'
    });
  }
});

// Get user's pending payments
router.get('/pending-payments', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    const pendingPayments = await Booking.getUserPendingPayments(userId);
    
    // Add urgency indicators
    const enrichedPayments = pendingPayments.map(booking => {
      const createdDate = new Date(booking.bookedAt);
      const hoursSinceCreated = (new Date() - createdDate) / (1000 * 60 * 60);
      
      return {
        ...booking.toObject(),
        hoursSinceCreated: Math.floor(hoursSinceCreated),
        isUrgent: hoursSinceCreated > 24, // Pending for more than 24 hours
        paymentDue: booking.paymentStatus === 'cash_pending' ? 'Cash collection pending' : 'Payment required'
      };
    });
    
    res.json({
      success: true,
      data: enrichedPayments
    });
    
  } catch (error) {
    logger.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending payments'
    });
  }
});

// Get transaction summary for a specific time period
router.get('/transactions', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate, year } = req.query;
    
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        paymentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else if (year) {
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);
      dateFilter = {
        paymentDate: {
          $gte: yearStart,
          $lte: yearEnd
        }
      };
    }
    
    const transactions = await Booking.find({
      userId,
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      ...dateFilter
    }).sort({ paymentDate: -1 });
    
    // Calculate monthly breakdown
    const monthlyBreakdown = {};
    let totalSpent = 0;
    
    transactions.forEach(transaction => {
      const month = transaction.paymentDate.toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = {
          month,
          totalAmount: 0,
          transactionCount: 0,
          transactions: []
        };
      }
      
      monthlyBreakdown[month].totalAmount += transaction.totalAmount;
      monthlyBreakdown[month].transactionCount += 1;
      monthlyBreakdown[month].transactions.push({
        id: transaction._id,
        membershipType: transaction.membershipType,
        duration: transaction.membershipDuration,
        amount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        paymentDate: transaction.paymentDate,
        timeSlot: transaction.timeSlot
      });
      
      totalSpent += transaction.totalAmount;
    });
    
    const summary = {
      totalTransactions: transactions.length,
      totalSpent,
      averageTransactionAmount: transactions.length > 0 ? totalSpent / transactions.length : 0,
      paymentMethods: {
        upi: transactions.filter(t => t.paymentMethod === 'upi').length,
        cash: transactions.filter(t => t.paymentMethod === 'cash').length
      }
    };
    
    res.json({
      success: true,
      data: {
        transactions,
        monthlyBreakdown: Object.values(monthlyBreakdown).sort((a, b) => b.month.localeCompare(a.month)),
        summary
      }
    });
    
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction data'
    });
  }
});

// Get membership timeline (visual representation of user's journey)
router.get('/timeline', auth, requireEmailVerification, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const allBookings = await Booking.find({ userId })
      .sort({ bookedAt: 1 })
      .lean();
    
    const timeline = allBookings.map((booking, index) => {
      const startDate = new Date(booking.membershipStartDate);
      const endDate = new Date(booking.membershipEndDate);
      const today = new Date();
      
      let phase = 'completed';
      if (booking.paymentStatus === 'pending' || booking.paymentStatus === 'cash_pending') {
        phase = 'pending';
      } else if (booking.paymentStatus === 'failed') {
        phase = 'failed';
      } else if (today >= startDate && today <= endDate) {
        phase = 'active';
      } else if (today < startDate) {
        phase = 'upcoming';
      }
      
      return {
        id: booking._id,
        bookingNumber: index + 1,
        membershipType: booking.membershipType,
        timeSlot: booking.timeSlot,
        duration: booking.membershipDuration,
        startDate: booking.membershipStartDate,
        endDate: booking.membershipEndDate,
        amount: booking.totalAmount,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        bookedAt: booking.bookedAt,
        phase,
        isRenewal: index > 0
      };
    });
    
    res.json({
      success: true,
      data: {
        timeline,
        stats: {
          totalMemberships: timeline.length,
          renewals: timeline.filter(t => t.isRenewal).length,
          firstMembership: timeline[0]?.bookedAt,
          totalInvestment: timeline.reduce((sum, t) => {
            return sum + (t.paymentStatus === 'completed' || t.paymentStatus === 'cash_collected' ? t.amount : 0);
          }, 0)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch membership timeline'
    });
  }
});

module.exports = router;