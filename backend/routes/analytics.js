const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Membership = require('../models/Membership');
const Booking = require('../models/Booking');
const User = require('../models/User');

// Admin Analytics Dashboard Data
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      examDistribution,
      paymentMethodDistribution,
      membershipTypeDistribution,
      timeSlotDistribution,
      educationDistribution,
      occupationDistribution,
      revenueData,
      pendingCashPayments
    ] = await Promise.all([
      Membership.getExamDistribution(),
      Booking.getPaymentMethodDistribution(), 
      Booking.getMembershipTypeDistribution(),
      Booking.getTimeSlotDistribution(),
      Membership.getEducationDistribution(),
      Membership.getOccupationDistribution(),
      Booking.getRevenueByDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()), // Last 30 days
      Booking.getPendingCashPayments()
    ]);

    // Summary statistics
    const totalUsers = await User.countDocuments();
    const totalMemberships = await Membership.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: { $in: ['completed', 'cash_collected'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const activeBookings = await Booking.countDocuments({ 
      isActive: true, 
      membershipActive: true 
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalMemberships,
          totalBookings,
          activeBookings,
          totalRevenue: totalRevenue[0]?.total || 0,
          pendingCashPayments: pendingCashPayments.length
        },
        examDistribution,
        paymentMethodDistribution,
        membershipTypeDistribution,
        timeSlotDistribution,
        educationDistribution,
        occupationDistribution,
        revenueData,
        pendingCashPayments: pendingCashPayments.slice(0, 10) // Latest 10
      }
    });

  } catch (error) {
    logger.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Exam-wise analytics
router.get('/exams', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const examData = await Membership.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'userId',
          foreignField: 'userId',
          as: 'bookings'
        }
      },
      {
        $group: {
          _id: '$examPreparation',
          membershipCount: { $sum: 1 },
          bookingCount: { $sum: { $size: '$bookings' } },
          revenue: {
            $sum: {
              $reduce: {
                input: '$bookings',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $cond: [
                      { $in: ['$$this.paymentStatus', ['completed', 'cash_collected']] },
                      '$$this.totalAmount',
                      0
                    ]}
                  ]
                }
              }
            }
          }
        }
      },
      { $sort: { membershipCount: -1 } }
    ]);

    res.json({
      success: true,
      data: examData
    });

  } catch (error) {
    logger.error('Exam analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam analytics'
    });
  }
});

// Payment analytics
router.get('/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const paymentAnalytics = await Booking.aggregate([
      {
        $match: {
          bookedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            paymentMethod: '$paymentMethod',
            paymentStatus: '$paymentStatus'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const dailyRevenue = await Booking.getRevenueByDate(start, end);

    res.json({
      success: true,
      data: {
        paymentAnalytics,
        dailyRevenue,
        dateRange: { start, end }
      }
    });

  } catch (error) {
    logger.error('Payment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment analytics'
    });
  }
});

// Export data for external analysis
router.get('/export/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'memberships':
        data = await Membership.find()
          .populate('userId', 'fullName email phoneNumber dyanpittId')
          .sort({ submittedAt: -1 });
        filename = `memberships_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'bookings':
        data = await Booking.find()
          .populate('userId', 'fullName email phoneNumber dyanpittId')
          .sort({ bookedAt: -1 });
        filename = `bookings_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'revenue':
        data = await Booking.find({ paymentStatus: { $in: ['completed', 'cash_collected'] } })
          .populate('userId', 'fullName email phoneNumber dyanpittId')
          .sort({ paymentDate: -1 });
        filename = `revenue_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Use: memberships, bookings, or revenue'
        });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data,
        exportedAt: new Date(),
        totalRecords: data.length
      });
    }

  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data, type) {
  if (!data || data.length === 0) return '';

  const headers = getCSVHeaders(type);
  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = headers.map(header => {
      const value = getNestedValue(item, header);
      return `"${String(value || '').replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

function getCSVHeaders(type) {
  switch (type) {
    case 'memberships':
      return ['userId.fullName', 'userId.email', 'examPreparation', 'educationalBackground', 'submittedAt'];
    case 'bookings':
      return ['userId.fullName', 'userId.email', 'membershipType', 'paymentMethod', 'totalAmount', 'paymentStatus', 'bookedAt'];
    case 'revenue':
      return ['userId.fullName', 'userId.email', 'membershipType', 'totalAmount', 'paymentMethod', 'paymentDate'];
    default:
      return [];
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

module.exports = router;