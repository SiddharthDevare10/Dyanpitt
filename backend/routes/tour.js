const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const TourRequest = require('../models/TourRequest');
const { body, validationResult } = require('express-validator');

// Validation middleware for tour request
const validateTourRequest = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('phoneNumber').matches(/^\+91[6-9]\d{9}$/).withMessage('Phone number must be in +91 format with valid Indian mobile number'),
  body('gender').isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Valid gender is required'),
  body('tourDate').isISO8601().withMessage('Valid tour date is required'),
  body('tourTime').isIn([
    "9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
    "12:00 PM - 1:00 PM", "1:00 PM - 2:00 PM", "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM",
    "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM", "8:00 PM - 9:00 PM"
  ]).withMessage('Valid tour time is required'),
  body('educationalBackground').isIn([
    'High School', 'Graduation', 'Post Graduation', 'Doctorate Degree', 
    'Technical or Vocational School', 'Other'
  ]).withMessage('Valid educational background is required'),
  body('currentOccupation').isIn([
    'Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired', 'Other'
  ]).withMessage('Valid current occupation is required'),
  body('examPreparation').isIn([
    'MPSC', 'UPSC', 'Saral Seva', 'Railway', 'Staff Selection Commission', 
    'NOR-CET', 'Police Bharti', 'SRPF', 'CRPF', 'Army-GD', 'Army-NA',
    'SSC (10th)', 'HSC (12th)', 'JEE', 'NEET', 'MHT-CET', 'UG', 'PG', 
    'PHD', 'MCR', 'CDS', 'DMER', 'Banking', 'Any Other'
  ]).withMessage('Valid exam preparation is required'),
  body('examinationDate').isISO8601().withMessage('Valid examination date is required'),
  body('howDidYouKnow').isIn([
    'Friends', 'Google', 'Facebook', 'Instagram', 'Vivek Sindhu', 
    'WhatsApp', 'SMS', 'Pamphlet', 'Banner / Hoarding'
  ]).withMessage('Valid source is required'),
  body('previousStudyRoomExperience').trim().isLength({ min: 1 }).withMessage('Previous study room experience is required'),
  body('studyRoomComparison').trim().isLength({ min: 1 }).withMessage('Study room comparison is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required')
];

// POST /api/tour/request - Submit a new tour request
router.post('/request', validateTourRequest, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      email, fullName, phoneNumber, gender, tourDate, tourTime,
      educationalBackground, currentOccupation, jobTitle, examPreparation,
      examinationDate, howDidYouKnow,
      previousStudyRoomExperience, studyRoomComparison, startDate
    } = req.body;

    // Check if user already has a pending or confirmed tour
    const existingTour = await TourRequest.hasPendingTour(email);
    if (existingTour) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or confirmed tour request'
      });
    }

    // Validate tour date is in the future
    const selectedDate = new Date(tourDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (selectedDate < tomorrow) {
      return res.status(400).json({
        success: false,
        message: 'Tour date must be at least tomorrow'
      });
    }

    // Create new tour request
    const tourRequest = new TourRequest({
      email: email.toLowerCase(),
      fullName,
      phoneNumber,
      gender,
      tourDate,
      tourTime,
      educationalBackground,
      currentOccupation,
      jobTitle: (currentOccupation === 'Student' || currentOccupation === 'Unemployed') ? null : jobTitle,
      examPreparation,
      examinationDate,
      howDidYouKnow,
      previousStudyRoomExperience,
      studyRoomComparison,
      startDate,
      tourStatus: 'pending'
    });

    await tourRequest.save();

    res.status(201).json({
      success: true,
      message: 'Tour request submitted successfully',
      data: {
        _id: tourRequest._id,
        email: tourRequest.email,
        fullName: tourRequest.fullName,
        phoneNumber: tourRequest.phoneNumber,
        gender: tourRequest.gender,
        tourDate: tourRequest.tourDate,
        tourTime: tourRequest.tourTime,
        tourStatus: tourRequest.tourStatus,
        educationalBackground: tourRequest.educationalBackground,
        currentOccupation: tourRequest.currentOccupation,
        jobTitle: tourRequest.jobTitle,
        examPreparation: tourRequest.examPreparation,
        examinationDate: tourRequest.examinationDate,
        howDidYouKnow: tourRequest.howDidYouKnow,
        previousStudyRoomExperience: tourRequest.previousStudyRoomExperience,
        studyRoomComparison: tourRequest.studyRoomComparison,
        startDate: tourRequest.startDate,
        createdAt: tourRequest.createdAt
      }
    });

  } catch (error) {
    logger.error('Error creating tour request:', error);
    
    // Handle duplicate tour request error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have a tour request for this date'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/tour/requests/:email - Get tour requests by email
router.get('/requests/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    const tourRequests = await TourRequest.findByEmail(email);

    res.json({
      success: true,
      data: tourRequests
    });

  } catch (error) {
    logger.error('Error fetching tour requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/tour/requests - Get all tour requests (admin only)
router.get('/requests', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    
    const query = {};
    if (status) query.tourStatus = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.tourDate = { $gte: startDate, $lt: endDate };
    }

    const tourRequests = await TourRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TourRequest.countDocuments(query);

    res.json({
      success: true,
      data: tourRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching tour requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/tour/requests/:id/status - Update tour request status (admin only)
router.put('/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const tourRequest = await TourRequest.findByIdAndUpdate(
      id,
      { 
        tourStatus: status,
        adminNotes: adminNotes || undefined,
        isCompleted: status === 'completed' || status === 'confirmed'
      },
      { new: true }
    );

    if (!tourRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tour request not found'
      });
    }

    res.json({
      success: true,
      message: 'Tour request status updated successfully',
      data: tourRequest
    });

  } catch (error) {
    logger.error('Error updating tour request status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/tour/scan-qr - Scan QR code and complete tour (admin only)
router.post('/scan-qr', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR data is required'
      });
    }

    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      logger.warn('QR code parsing failed:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      });
    }

    // Validate QR data structure
    if (parsedData.type !== 'VISITOR_PASS' || !parsedData.id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visitor pass QR code'
      });
    }

    // Find and update tour request
    const tourRequest = await TourRequest.findById(parsedData.id);

    if (!tourRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tour request not found'
      });
    }

    // Check if tour is already completed
    if (tourRequest.tourStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Tour has already been completed',
        data: tourRequest
      });
    }

    // Update tour status to completed
    tourRequest.tourStatus = 'completed';
    tourRequest.isCompleted = true;
    tourRequest.adminNotes = (tourRequest.adminNotes || '') + `\nCompleted via QR scan on ${new Date().toISOString()}`;
    
    await tourRequest.save();

    // Send feedback email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendFeedbackEmail(tourRequest.email, tourRequest.fullName);
    } catch (emailError) {
      logger.error('Error sending feedback email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Tour completed successfully. Feedback email sent to visitor.',
      data: tourRequest
    });

  } catch (error) {
    logger.error('Error processing QR scan:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;