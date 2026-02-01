/**
 * Indian Standard Time (IST) Utilities
 * Ensures all date/time operations in the app follow IST consistently
 */

// IST is UTC+5:30
const USE_DFNS_TZ = (import.meta.env.VITE_USE_DATEFNS_TZ || 'false').toLowerCase() === 'true';
let _tz = 'Asia/Kolkata';
async function _toZoned(date) {
  if (!USE_DFNS_TZ) return new Date(new Date(date).toLocaleString('en-US', { timeZone: _tz }));
  try {
    const _pkg = 'date-fns-tz';
    const { toZonedTime } = await import(/* @vite-ignore */ _pkg);
    return toZonedTime(new Date(date), _tz);
  } catch {
    return new Date(new Date(date).toLocaleString('en-US', { timeZone: _tz }));
  }
}
async function _formatInTz(date, fmt, options = {}) {
  if (!USE_DFNS_TZ) return new Date(date).toLocaleString('en-IN', { timeZone: _tz, ...options });
  try {
    const _pkg2 = 'date-fns-tz';
    const { formatInTimeZone } = await import(/* @vite-ignore */ _pkg2);
    return formatInTimeZone(new Date(date), _tz, fmt);
  } catch {
    return new Date(date).toLocaleString('en-IN', { timeZone: _tz, ...options });
  }
}
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Get current IST time as Date object
 */
export const getCurrentIST = () => {
  const now = new Date();
  // Use proper timezone conversion instead of manual offset
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

/**
 * Convert any date to IST
 */
export const toIST = (date) => {
  if (!date) return null;
  const inputDate = new Date(date);
  // Use proper timezone conversion instead of manual offset
  return new Date(inputDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

/**
 * Format date in IST for display
 */
export const formatISTDate = (date, options = {}) => {
  if (!date) return 'Not specified';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  try {
    return new Date(date).toLocaleDateString('en-IN', defaultOptions);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format date and time in IST for display
 */
export const formatISTDateTime = (date, options = {}) => {
  if (!date) return 'Not specified';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  try {
    return new Date(date).toLocaleString('en-IN', defaultOptions);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format time only in IST for display
 */
export const formatISTTime = (date, options = {}) => {
  if (!date) return 'Not specified';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  try {
    return new Date(date).toLocaleTimeString('en-IN', defaultOptions);
  } catch {
    return 'Invalid time';
  }
};

/**
 * Get IST timestamp for database storage
 */
export const getISTTimestamp = (date = null) => {
  const inputDate = date ? new Date(date) : new Date();
  // Use proper timezone conversion instead of manual offset
  return new Date(inputDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
};

/**
 * Check if a date is today in IST
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const today = getCurrentIST();
  const checkDate = new Date(date);
  
  return (
    today.getDate() === checkDate.getDate() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getFullYear() === checkDate.getFullYear()
  );
};

/**
 * Get start of day in IST
 */
export const getISTStartOfDay = (date = null) => {
  const istDate = date ? toIST(date) : getCurrentIST();
  istDate.setHours(0, 0, 0, 0);
  return istDate;
};

/**
 * Get end of day in IST
 */
export const getISTEndOfDay = (date = null) => {
  const istDate = date ? toIST(date) : getCurrentIST();
  istDate.setHours(23, 59, 59, 999);
  return istDate;
};

/**
 * Add hours to IST time
 */
export const addHoursIST = (date, hours) => {
  const istDate = toIST(date);
  return new Date(istDate.getTime() + (hours * 60 * 60 * 1000));
};

/**
 * Add days to IST time
 */
export const addDaysIST = (date, days) => {
  const istDate = toIST(date);
  return new Date(istDate.getTime() + (days * 24 * 60 * 60 * 1000));
};

/**
 * Calculate time difference in milliseconds (IST aware)
 */
export const getTimeDifferenceIST = (date1, date2) => {
  const istDate1 = toIST(date1);
  const istDate2 = toIST(date2);
  return istDate1.getTime() - istDate2.getTime();
};

/**
 * Format remaining time for countdown displays
 */
export const formatRemainingTime = (milliseconds) => {
  if (milliseconds <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

/**
 * Format for database storage (ISO string but IST adjusted)
 */
export const toISTString = (date = null) => {
  return getISTTimestamp(date).toISOString();
};

export default {
  getCurrentIST,
  toIST,
  formatISTDate,
  formatISTDateTime,
  formatISTTime,
  getISTTimestamp,
  isToday,
  getISTStartOfDay,
  getISTEndOfDay,
  addHoursIST,
  addDaysIST,
  getTimeDifferenceIST,
  formatRemainingTime,
  toISTString
};