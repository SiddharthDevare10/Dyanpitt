const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, 'selfie_' + uniqueSuffix + path.extname(file.originalname));
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
    const {
      visitedBefore,
      fatherName,
      parentContactNumber,
      educationalBackground,
      currentOccupation,
      currentAddress,
      jobTitle,
      examPreparation,
      examinationDate,
      studyRoomDuration
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'visitedBefore', 'fatherName', 'parentContactNumber', 
      'educationalBackground', 'currentOccupation', 'currentAddress',
      'examPreparation', 'examinationDate', 'studyRoomDuration'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Check if selfie photo is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Selfie photo is required'
      });
    }

    const selfiePhotoUrl = `/uploads/selfies/${req.file.filename}`;

    // Check if member details already exist
    let member = await Member.findOne({ dyanpittId: req.user.dyanpittId });

    if (member) {
      // Update existing member details
      member.visitedBefore = visitedBefore;
      member.fatherName = fatherName;
      member.parentContactNumber = parentContactNumber;
      member.educationalBackground = educationalBackground;
      member.currentOccupation = currentOccupation;
      member.currentAddress = currentAddress;
      member.jobTitle = jobTitle || '';
      member.examPreparation = examPreparation;
      member.examinationDate = new Date(examinationDate);
      member.studyRoomDuration = studyRoomDuration;
      member.selfiePhotoUrl = selfiePhotoUrl;
      member.isCompleted = true;
    } else {
      // Create new member details
      member = new Member({
        dyanpittId: req.user.dyanpittId,
        visitedBefore,
        fatherName,
        parentContactNumber,
        educationalBackground,
        currentOccupation,
        currentAddress,
        jobTitle: jobTitle || '',
        examPreparation,
        examinationDate: new Date(examinationDate),
        studyRoomDuration,
        selfiePhotoUrl,
        isCompleted: true
      });
    }

    await member.save();

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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get member details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const member = await Member.findOne({ dyanpittId: req.user.dyanpittId });

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
    const member = await Member.findOne({ dyanpittId: req.user.dyanpittId });

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