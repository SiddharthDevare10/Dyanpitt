const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Booking = require('../models/Booking');

// GET /api/membership/active - list active memberships (derived from bookings)
router.get('/active', auth, async (req, res) => {
  try {
    const now = new Date();
    const active = await Booking.find({
      paymentStatus: { $in: ['completed', 'cash_collected'] },
      membershipActive: true,
      membershipStartDate: { $lte: now },
      membershipEndDate: { $gte: now },
      isActive: true
    }).select('-__v').sort({ membershipEndDate: 1 });

    res.json({ success: true, data: active });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load active memberships' });
  }
});

module.exports = router;
