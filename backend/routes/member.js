const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const User = require('../models/User');
const Member = require('../models/Member');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for selfie uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/selfies/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const uuid = crypto.randomBytes(8).toString('hex'); // 16 char unique string
    const ext = path.extname(file.originalname);
    cb(null, `selfie_${timestamp}_${uuid}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, and PNG files are allowed for selfies'));
    }
  }
});

// Create or update member details
router.post('/details', authenticateToken, upload.single('selfiePhoto'), async (req, res) => {
  try {
    console.log('Member details request received');
    console.log('User:', { 
      userId: req.user.userId, 
      dyanpittId: req.user.dyanpittId, 
      email: req.user.email 
    });
    console.log('Request body:', req.body);
    console.log('File uploaded:', req.file ? 'Yes' : 'No');
    
    const {
      visitedBefore,
      fatherName,
      parentContactNumber,
      educationalBackground,
      currentOccupation,
      currentAddress,
      jobTitle,
      examPreparation,
      examinationDate
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'visitedBefore', 'fatherName', 'parentContactNumber', 
      'educationalBackground', 'currentOccupation', 'currentAddress',
      'examPreparation', 'examinationDate'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.log('Missing required field:', field);
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Check if selfie photo is uploaded
    if (!req.file) {
      console.log('No selfie photo uploaded');
      return res.status(400).json({
        success: false,
        message: 'Selfie photo is required'
      });
    }

    const selfiePhotoUrl = `/uploads/selfies/${req.file.filename}`;

    // Get user first
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if member details already exist using new findByUser method
    let member = await Member.findByUser(user);

    console.log('Existing member found:', member ? 'Yes' : 'No');

    if (member) {
      // Update existing member details
      member.email = req.user.email;
      member.visitedBefore = visitedBefore;
      member.fatherName = fatherName;
      member.parentContactNumber = parentContactNumber;
      member.educationalBackground = educationalBackground;
      member.currentOccupation = currentOccupation;
      member.currentAddress = currentAddress;
      member.jobTitle = jobTitle || '';
      member.examPreparation = examPreparation;
      member.examinationDate = new Date(examinationDate);
      member.selfiePhotoUrl = selfiePhotoUrl;
      member.isCompleted = true;
    } else {
      // Create new member using createForUser method
      const memberData = {
        visitedBefore,
        fatherName,
        parentContactNumber,
        educationalBackground,
        currentOccupation,
        currentAddress,
        jobTitle: jobTitle || '',
        examPreparation,
        examinationDate: new Date(examinationDate),
        selfiePhotoUrl,
        isCompleted: true
      };

      member = await Member.createForUser(user, memberData);
    }

    console.log('Saving member details...');
    if (!member.isNew) {
      await member.save(); // Only save if updating existing member
    }
    console.log('Member details saved successfully');

    // Update user's membership completion status
    await User.findByIdAndUpdate(req.user.userId, {
      membershipCompleted: true
    });

    res.json({
      success: true,
      message: 'Member details saved successfully',
      member
    });

  } catch (error) {
    console.error('Save member details error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get member details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const member = await Member.findByUser(user);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member details not found'
      });
    }

    res.json({
      success: true,
      member
    });

  } catch (error) {
    console.error('Get member details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if member details are completed
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const member = await Member.findByUser(user);

    res.json({
      success: true,
      isCompleted: member ? member.isCompleted : false,
      hasDetails: !!member
    });

  } catch (error) {
    console.error('Get member status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;