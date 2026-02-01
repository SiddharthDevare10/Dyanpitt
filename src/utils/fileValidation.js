/**
 * Standardized file validation utilities
 */

// File validation constants
export const FILE_VALIDATION = {
  AVATAR: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  },
  SELFIE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  }
};

export const FILE_ERROR_MESSAGES = {
  NO_FILE: 'Please select a file',
  INVALID_TYPE: 'Please select a valid image file (JPG, PNG, WEBP)',
  FILE_TOO_LARGE: 'File size must be less than 5MB',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.'
};

/**
 * Validate file against specified validation rules
 * @param {File} file - The file to validate
 * @param {string} type - Type of file ('AVATAR' or 'SELFIE')
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateFile = (file, type = 'AVATAR') => {
  if (!file) {
    return { isValid: false, error: FILE_ERROR_MESSAGES.NO_FILE };
  }

  const validation = FILE_VALIDATION[type];
  
  // Check file type
  if (!validation.allowedTypes.includes(file.type)) {
    return { isValid: false, error: FILE_ERROR_MESSAGES.INVALID_TYPE };
  }

  // Check file extension (additional security)
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validation.allowedExtensions.some(ext => 
    fileName.endsWith(ext)
  );
  
  if (!hasValidExtension) {
    return { isValid: false, error: FILE_ERROR_MESSAGES.INVALID_TYPE };
  }

  // Check file size
  if (file.size > validation.maxSize) {
    return { isValid: false, error: FILE_ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  return { isValid: true, error: null };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Create a preview URL for an image file
 * @param {File} file - The image file
 * @returns {string} - Object URL for preview
 */
export const createImagePreview = (file) => {
  if (!file || !file.type.startsWith('image/')) {
    return null;
  }
  return URL.createObjectURL(file);
};

/**
 * Clean up object URL to prevent memory leaks
 * @param {string} url - Object URL to revoke
 */
export const cleanupImagePreview = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export default {
  validateFile,
  formatFileSize,
  createImagePreview,
  cleanupImagePreview,
  FILE_VALIDATION,
  FILE_ERROR_MESSAGES
};