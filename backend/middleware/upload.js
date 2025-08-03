const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Track uploaded files for cleanup
const uploadedFiles = new Map(); // userId -> [filenames]

// Cleanup orphaned files older than 24 hours
const cleanupOrphanedFiles = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const selfiesDir = path.join(uploadsDir, 'selfies');
  
  const cleanupDirectory = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      // Delete files older than 24 hours that are not referenced in database
      if (stats.mtime.getTime() < twentyFourHoursAgo) {
        // Check if file is temporary (contains timestamp in name)
        if (file.includes('temp_') || file.includes('anonymous_')) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up orphaned file: ${file}`);
          } catch (error) {
            console.error(`Error deleting orphaned file ${file}:`, error);
          }
        }
      }
    });
  };
  
  cleanupDirectory(uploadsDir);
  cleanupDirectory(selfiesDir);
};

// Run cleanup every hour
setInterval(cleanupOrphanedFiles, 60 * 60 * 1000);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp_uuid_originalname
    const userId = req.user?.userId || 'anonymous';
    const timestamp = Date.now();
    const uuid = crypto.randomBytes(8).toString('hex'); // 16 char unique string
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize filename
    cb(null, `${userId}_${timestamp}_${uuid}_${name}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Middleware for handling single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for handling multiple file uploads
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum is ${maxCount}.`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple
};