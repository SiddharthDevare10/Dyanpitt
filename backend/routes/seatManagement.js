const express = require('express');
const Seat = require('../models/Seat');
const SeatAllocation = require('../models/SeatAllocation');
const Booking = require('../models/Booking');
const { authenticateToken: auth } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// Get available seats for booking
router.get('/available', auth, requireEmailVerification, async (req, res) => {
  try {
    const { membershipType, timeSlot, startDate, endDate } = req.query;
    
    if (!membershipType || !timeSlot || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'membershipType, timeSlot, startDate, and endDate are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }
    
    const availableSeats = await Seat.getAvailableSeats(membershipType, timeSlot, start, end);
    
    // Sort seats by preference (Regular first, then by seat number)
    const sortedSeats = availableSeats.sort((a, b) => {
      // Priority: Regular > Premium > Window > Corner > Accessible
      const typeOrder = { 'Regular': 1, 'Premium': 2, 'Window': 3, 'Corner': 4, 'Accessible': 5 };
      const aOrder = typeOrder[a.seatType] || 6;
      const bOrder = typeOrder[b.seatType] || 6;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      return a.seatNumber.localeCompare(b.seatNumber);
    });
    
    res.json({
      success: true,
      data: {
        availableSeats: sortedSeats,
        totalAvailable: sortedSeats.length,
        searchCriteria: {
          membershipType,
          timeSlot,
          startDate,
          endDate
        }
      }
    });
    
  } catch (error) {
    console.error('Get available seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available seats'
    });
  }
});

// Get seat layout with occupancy status
router.get('/layout', auth, requireEmailVerification, async (req, res) => {
  try {
    const { membershipType, timeSlot, startDate, endDate } = req.query;
    
    const layout = await Seat.getSeatLayout(
      membershipType || null,
      timeSlot || null,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    // Calculate statistics
    let totalSeats = 0;
    let occupiedSeats = 0;
    let availableSeats = 0;
    
    Object.values(layout).forEach(row => {
      row.forEach(seat => {
        totalSeats++;
        if (seat.isOccupied) {
          occupiedSeats++;
        } else if (!seat.isMaintenanceMode) {
          availableSeats++;
        }
      });
    });
    
    res.json({
      success: true,
      data: {
        layout,
        statistics: {
          totalSeats,
          occupiedSeats,
          availableSeats,
          occupancyRate: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get seat layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seat layout'
    });
  }
});

// Reserve/Allocate seat for a booking
router.post('/allocate', auth, requireEmailVerification, async (req, res) => {
  try {
    const { bookingId, preferredSeatNumber } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }
    
    // Verify booking belongs to current user
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: req.user.userId
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }
    
    // Check if seat already allocated
    const existingAllocation = await SeatAllocation.findOne({
      bookingId: bookingId,
      isActive: true
    });
    
    if (existingAllocation) {
      return res.status(400).json({
        success: false,
        message: 'Seat already allocated for this booking',
        data: {
          seatNumber: existingAllocation.seatNumber,
          allocationId: existingAllocation._id
        }
      });
    }
    
    // Allocate seat
    const allocation = await SeatAllocation.allocateSeat(bookingId, preferredSeatNumber);
    
    // Populate seat details
    await allocation.populate('seatId', 'seatNumber row column seatType features');
    
    res.json({
      success: true,
      message: 'Seat allocated successfully',
      data: {
        allocationId: allocation._id,
        seatNumber: allocation.seatNumber,
        seatDetails: allocation.seatId,
        timeSlot: allocation.timeSlot,
        membershipType: allocation.membershipType,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        status: allocation.allocationStatus
      }
    });
    
  } catch (error) {
    console.error('Allocate seat error:', error);
    
    if (error.message.includes('No seats available')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'NO_SEATS_AVAILABLE'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to allocate seat'
    });
  }
});

// Get user's current seat allocations
router.get('/my-allocations', auth, requireEmailVerification, async (req, res) => {
  try {
    const currentAllocations = await SeatAllocation.getUserCurrentAllocations(req.user.userId);
    
    res.json({
      success: true,
      data: currentAllocations
    });
    
  } catch (error) {
    console.error('Get user allocations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seat allocations'
    });
  }
});

// Get user's allocation history
router.get('/my-history', auth, requireEmailVerification, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const allocationHistory = await SeatAllocation.getUserAllocationHistory(req.user.userId, limit);
    
    res.json({
      success: true,
      data: allocationHistory
    });
    
  } catch (error) {
    console.error('Get allocation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocation history'
    });
  }
});

// Cancel seat allocation (before payment)
router.delete('/cancel/:allocationId', auth, requireEmailVerification, async (req, res) => {
  try {
    const allocationId = req.params.allocationId;
    
    // Find allocation and verify ownership
    const allocation = await SeatAllocation.findOne({
      _id: allocationId,
      userId: req.user.userId,
      isActive: true
    });
    
    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Seat allocation not found or access denied'
      });
    }
    
    // Only allow cancellation if payment is not completed
    if (allocation.paymentStatus === 'completed' || allocation.paymentStatus === 'cash_collected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel allocation after payment completion'
      });
    }
    
    // Cancel allocation
    const cancelledAllocation = await SeatAllocation.cancelAllocation(
      allocation.bookingId, 
      'Cancelled by user'
    );
    
    res.json({
      success: true,
      message: 'Seat allocation cancelled successfully',
      data: {
        allocationId: cancelledAllocation._id,
        seatNumber: cancelledAllocation.seatNumber,
        status: cancelledAllocation.allocationStatus
      }
    });
    
  } catch (error) {
    console.error('Cancel allocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel seat allocation'
    });
  }
});

// Admin routes

// Get all seat allocations (Admin only)
router.get('/admin/allocations', auth, async (req, res) => {
  try {
    // Check admin privileges
    const { User } = require('../models/User');
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { status, timeSlot, startDate, endDate } = req.query;
    
    let query = {};
    
    if (status) {
      query.allocationStatus = status;
    }
    
    if (timeSlot) {
      query.timeSlot = timeSlot;
    }
    
    if (startDate && endDate) {
      query.$or = [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ];
    }
    
    const [allocations, total] = await Promise.all([
      SeatAllocation.find(query)
        .populate('userId', 'fullName email phoneNumber dyanpittId')
        .populate('seatId', 'seatNumber row column seatType features')
        .sort({ allocatedAt: -1 })
        .skip(skip)
        .limit(limit),
      SeatAllocation.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        allocations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Get admin allocations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocations'
    });
  }
});

// Get seat occupancy statistics (Admin only)
router.get('/admin/occupancy-stats', auth, async (req, res) => {
  try {
    // Check admin privileges
    const { User } = require('../models/User');
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const occupancyStats = await SeatAllocation.getOccupancyStats(start, end);
    
    // Get total seat counts
    const totalSeats = await Seat.countDocuments({ isActive: true });
    const seatsByType = await Seat.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$seatType', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        occupancyStats,
        totalSeats,
        seatsByType,
        dateRange: { startDate: start, endDate: end }
      }
    });
    
  } catch (error) {
    console.error('Get occupancy stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch occupancy statistics'
    });
  }
});

// Initialize default seats (Admin only)
router.post('/admin/initialize-seats', auth, async (req, res) => {
  try {
    // Check admin privileges
    const { User } = require('../models/User');
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const seatsCreated = await Seat.initializeDefaultSeats();
    
    res.json({
      success: true,
      message: 'Seat layout initialized successfully',
      data: {
        seatsCreated
      }
    });
    
  } catch (error) {
    console.error('Initialize seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize seats'
    });
  }
});

module.exports = router;