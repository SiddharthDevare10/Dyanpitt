const logger = require('../utils/logger');
/**
 * Indian Standard Time (IST) Utilities for Backend
 * Ensures all date/time operations in the backend follow IST consistently
 */

// IST is UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Get current IST time as Date object
 * Reference: 23 Nov 2025, 14:03 IST (24-hour format)
 */
const getCurrentIST = () => {
  // Use actual current time in IST
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

/**
 * Convert any date to IST
 */
const toIST = (date) => {
  if (!date) return null;
  const inputDate = new Date(date);
  // Use proper timezone conversion instead of manual offset
  return new Date(inputDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

/**
 * Format date in IST for display (DD/MM/YYYY format)
 */
const formatISTDate = (date, options = {}) => {
  if (!date) return 'Not specified';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  
  try {
    return new Date(date).toLocaleDateString('en-IN', defaultOptions);
  } catch (error) {
    logger.warn('Date formatting error:', error);
    return 'Invalid date';
  }
};

/**
 * Format date and time in IST for display (DD/MM/YYYY HH:MM:SS)
 */
const formatISTDateTime = (date, options = {}) => {
  if (!date) return 'Not specified';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // 24-hour format
    ...options
  };
  
  try {
    return new Date(date).toLocaleString('en-IN', defaultOptions);
  } catch (error) {
    logger.warn('Date time formatting error:', error);
    return 'Invalid date';
  }
};

/**
 * Format time only in IST for display (24-hour format: HH:MM:SS)
 */
const formatISTTime = (date, options = {}) => {
  if (!date) return 'Not specified';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // 24-hour format
    ...options
  };
  
  try {
    return new Date(date).toLocaleTimeString('en-IN', defaultOptions);
  } catch (error) {
    logger.warn('Time formatting error:', error);
    return 'Invalid time';
  }
};

/**
 * Get IST timestamp for database storage
 */
const getISTTimestamp = (date = null) => {
  const inputDate = date ? new Date(date) : new Date();
  // Use proper timezone conversion instead of manual offset
  return new Date(inputDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

/**
 * Add hours to IST time
 */
const addHoursIST = (date, hours) => {
  const istDate = toIST(date);
  return new Date(istDate.getTime() + (hours * 60 * 60 * 1000));
};

/**
 * Add days to IST time
 */
const addDaysIST = (date, days) => {
  const istDate = toIST(date);
  return new Date(istDate.getTime() + (days * 24 * 60 * 60 * 1000));
};

/**
 * For date-only fields (like DOB) - preserve exact date without timezone shifts
 */
const toDateOnly = (date) => {
  if (!date) return date;
  
  // If the date is already a string in YYYY-MM-DD format, parse it carefully
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-').map(Number);
    // Create date in UTC to avoid any timezone interpretation
    return new Date(Date.UTC(year, month - 1, day));
  }
  
  // If it's a Date object or datetime string, extract just the date part
  const d = new Date(date);
  
  // Handle the case where date might be interpreted in local timezone
  // Get the date components and create a UTC date
  if (typeof date === 'string') {
    // Parse the string to get date components
    const dateStr = date.split('T')[0]; // Get just the date part if it's an ISO string
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
  
  // Fallback: Use local date components but create UTC date
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

/**
 * Format for database storage (ISO string but IST adjusted)
 */
const toISTString = (date = null) => {
  return getISTTimestamp(date).toISOString();
};

/**
 * Get start of day in IST (00:00:00.000)
 */
const getISTStartOfDay = (date = null) => {
  const istDate = date ? toIST(date) : getCurrentIST();
  const startOfDay = new Date(istDate);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

/**
 * Get end of day in IST (23:59:59.999)
 */
const getISTEndOfDay = (date = null) => {
  const istDate = date ? toIST(date) : getCurrentIST();
  const endOfDay = new Date(istDate);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

module.exports = {
  getCurrentIST,
  toIST,
  formatISTDate,
  formatISTDateTime,
  formatISTTime,
  getISTTimestamp,
  addHoursIST,
  addDaysIST,
  toDateOnly,
  toISTString,
  getISTStartOfDay,
  getISTEndOfDay,
  IST_OFFSET_MS
};