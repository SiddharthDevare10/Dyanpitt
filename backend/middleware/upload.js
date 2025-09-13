const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

// Track uploaded files for cleanup
// const uploadedFiles = new Map(); // userId -> [filenames] - Currently unused

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
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Image processing functions with intelligent compression to stay under 1MB
const processImage = async (buffer, options = {}) => {
  const {
    width = 800,
    height = 800,
    quality = 85,
    format = 'jpeg',
    maxSizeKB = 1024 // 1MB target
  } = options;

  try {
    // First attempt with provided settings
    let processor = sharp(buffer)
      .resize(width, height, { 
        fit: 'inside', 
        withoutEnlargement: true 
      });

    if (format === 'jpeg') {
      processor = processor.jpeg({ 
        quality, 
        progressive: true,
        mozjpeg: true 
      });
    } else if (format === 'webp') {
      processor = processor.webp({ quality });
    } else if (format === 'png') {
      processor = processor.png({ 
        quality, 
        compressionLevel: 9 
      });
    }

    let processedBuffer = await processor.toBuffer();
    let currentSizeKB = processedBuffer.length / 1024;
    
    console.log(`Initial compression: ${currentSizeKB.toFixed(2)}KB (target: ${maxSizeKB}KB)`);

    // If image is already under target size, return it
    if (currentSizeKB <= maxSizeKB) {
      return processedBuffer;
    }

    // Intelligent compression: reduce quality and dimensions iteratively
    let currentQuality = quality;
    let currentWidth = width;
    let currentHeight = height;
    let attempts = 0;
    const maxAttempts = 10;

    while (currentSizeKB > maxSizeKB && attempts < maxAttempts) {
      attempts++;
      
      // Strategy 1: Reduce quality first (more effective for photos)
      if (currentQuality > 20) {
        currentQuality = Math.max(20, currentQuality - 10);
      }
      // Strategy 2: If quality is already low, reduce dimensions
      else if (currentWidth > 400 || currentHeight > 400) {
        currentWidth = Math.max(400, Math.floor(currentWidth * 0.9));
        currentHeight = Math.max(400, Math.floor(currentHeight * 0.9));
        currentQuality = Math.max(20, currentQuality + 5); // Slightly increase quality when reducing size
      }
      // Strategy 3: Further reduce dimensions if still too large
      else {
        currentWidth = Math.max(300, Math.floor(currentWidth * 0.8));
        currentHeight = Math.max(300, Math.floor(currentHeight * 0.8));
      }

      // Reprocess with new settings
      processor = sharp(buffer)
        .resize(currentWidth, currentHeight, { 
          fit: 'inside', 
          withoutEnlargement: true 
        });

      if (format === 'jpeg') {
        processor = processor.jpeg({ 
          quality: currentQuality, 
          progressive: true,
          mozjpeg: true 
        });
      } else if (format === 'webp') {
        processor = processor.webp({ quality: currentQuality });
      } else if (format === 'png') {
        processor = processor.png({ 
          quality: currentQuality, 
          compressionLevel: 9 
        });
      }

      processedBuffer = await processor.toBuffer();
      currentSizeKB = processedBuffer.length / 1024;
      
      console.log(`Attempt ${attempts}: ${currentSizeKB.toFixed(2)}KB (${currentWidth}x${currentHeight}, quality: ${currentQuality})`);
    }

    if (currentSizeKB > maxSizeKB) {
      console.warn(`Warning: Could not compress image below ${maxSizeKB}KB after ${attempts} attempts. Final size: ${currentSizeKB.toFixed(2)}KB`);
    } else {
      console.log(`✅ Successfully compressed to ${currentSizeKB.toFixed(2)}KB in ${attempts} attempts`);
    }

    return processedBuffer;
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
};

const createThumbnail = async (buffer, size = 150) => {
  try {
    // Thumbnails should be small, so we can be more aggressive with compression
    const maxThumbnailSizeKB = 50; // 50KB max for thumbnails
    
    let processor = sharp(buffer)
      .resize(size, size, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 75,
        progressive: true,
        mozjpeg: true
      });

    let thumbnailBuffer = await processor.toBuffer();
    let currentSizeKB = thumbnailBuffer.length / 1024;
    
    // If thumbnail is already small enough, return it
    if (currentSizeKB <= maxThumbnailSizeKB) {
      return thumbnailBuffer;
    }

    // Reduce quality for thumbnails if needed
    let quality = 75;
    let attempts = 0;
    const maxAttempts = 5;

    while (currentSizeKB > maxThumbnailSizeKB && attempts < maxAttempts && quality > 30) {
      attempts++;
      quality = Math.max(30, quality - 10);
      
      processor = sharp(buffer)
        .resize(size, size, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true
        });

      thumbnailBuffer = await processor.toBuffer();
      currentSizeKB = thumbnailBuffer.length / 1024;
      
      console.log(`Thumbnail attempt ${attempts}: ${currentSizeKB.toFixed(2)}KB (quality: ${quality})`);
    }

    console.log(`✅ Thumbnail created: ${currentSizeKB.toFixed(2)}KB`);
    return thumbnailBuffer;
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    throw new Error('Failed to create thumbnail');
  }
};

const getImageMetadata = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels
    };
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return null;
  }
};

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

const memoryStorage = multer.memoryStorage();

const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

const uploadMemorySingle = (fieldName) => {
  return (req, res, next) => {
    uploadMemory.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
};

async function saveBufferToUploads(file, userId = 'anonymous') {
  const timestamp = Date.now();
  const uuid = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(file.originalname || '') || '';
  const name = path.basename(file.originalname || 'upload', ext).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${userId}_${timestamp}_${uuid}_${name}${ext}`;
  const targetPath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(targetPath, file.buffer);
  return filename;
}

// Enhanced function to save processed images
async function saveProcessedImage(buffer, userId = 'anonymous', type = 'main', originalName = 'upload') {
  const timestamp = Date.now();
  const uuid = crypto.randomBytes(8).toString('hex');
  const name = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${userId}_${timestamp}_${uuid}_${name}_${type}.jpg`;
  
  const targetPath = type === 'thumbnail' 
    ? path.join(thumbnailsDir, filename)
    : path.join(uploadsDir, filename);
    
  await fs.promises.writeFile(targetPath, buffer);
  return filename;
}

// Compression presets for different use cases
const COMPRESSION_PRESETS = {
  profile: { maxWidth: 400, maxHeight: 400, quality: 80, maxSizeKB: 200 }, // Profile pictures
  selfie: { maxWidth: 600, maxHeight: 600, quality: 85, maxSizeKB: 500 },   // Selfie photos
  document: { maxWidth: 1200, maxHeight: 1600, quality: 90, maxSizeKB: 800 }, // Document scans
  general: { maxWidth: 800, maxHeight: 800, quality: 85, maxSizeKB: 1024 }   // General uploads
};

// Enhanced upload middleware with intelligent image processing
const uploadWithProcessing = (fieldName, options = {}) => {
  const {
    createThumbnails = true,
    maxWidth = 800,
    maxHeight = 800,
    quality = 85,
    thumbnailSize = 150,
    maxSizeKB = 1024,
    preset = null // Can use 'profile', 'selfie', 'document', 'general'
  } = options;

  // Apply preset if specified
  let finalOptions = { maxWidth, maxHeight, quality, maxSizeKB };
  if (preset && COMPRESSION_PRESETS[preset]) {
    finalOptions = { ...finalOptions, ...COMPRESSION_PRESETS[preset] };
  }

  return async (req, res, next) => {
    uploadMemory.single(fieldName)(req, res, async (err) => {
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

      if (!req.file) {
        return next();
      }

      try {
        const userId = req.user?.userId || 'anonymous';
        const originalBuffer = req.file.buffer;
        const originalName = req.file.originalname;

        // Get original image metadata
        const metadata = await getImageMetadata(originalBuffer);
        console.log(`Processing image: ${originalName}, Original size: ${(originalBuffer.length / 1024).toFixed(2)}KB, Dimensions: ${metadata?.width}x${metadata?.height}`);

        // Process main image with intelligent compression
        const processedBuffer = await processImage(originalBuffer, {
          width: finalOptions.maxWidth,
          height: finalOptions.maxHeight,
          quality: finalOptions.quality,
          maxSizeKB: finalOptions.maxSizeKB,
          format: 'jpeg'
        });

        // Save main image
        const mainFilename = await saveProcessedImage(processedBuffer, userId, 'main', originalName);
        const mainUrl = `/uploads/${mainFilename}`;

        // Create and save thumbnail if requested
        let thumbnailUrl = null;
        let thumbnailBuffer = null;
        let thumbnailFilename = null;
        if (createThumbnails) {
          thumbnailBuffer = await createThumbnail(originalBuffer, thumbnailSize);
          thumbnailFilename = await saveProcessedImage(thumbnailBuffer, userId, 'thumbnail', originalName);
          thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
        }

        // Add processed file info to request
        req.processedFile = {
          main: {
            url: mainUrl,
            filename: mainFilename,
            size: processedBuffer.length
          },
          thumbnail: thumbnailUrl ? {
            url: thumbnailUrl,
            filename: thumbnailFilename,
            size: thumbnailBuffer.length
          } : null,
          original: {
            name: originalName,
            size: originalBuffer.length,
            metadata
          },
          compression: {
            originalSize: originalBuffer.length,
            compressedSize: processedBuffer.length,
            compressionRatio: ((1 - processedBuffer.length / originalBuffer.length) * 100).toFixed(2) + '%'
          }
        };

        console.log(`Image processed successfully: ${req.processedFile.compression.compressionRatio} compression achieved`);
        next();

      } catch (error) {
        console.error('Image processing error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error processing image: ' + error.message
        });
      }
    });
  };
};

// Utility function to create upload middleware with presets
const createUploadWithPreset = (fieldName, presetName, customOptions = {}) => {
  return uploadWithProcessing(fieldName, { preset: presetName, ...customOptions });
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadMemorySingle,
  uploadWithProcessing,
  createUploadWithPreset,
  saveBufferToUploads,
  saveProcessedImage,
  processImage,
  createThumbnail,
  getImageMetadata,
  COMPRESSION_PRESETS
};