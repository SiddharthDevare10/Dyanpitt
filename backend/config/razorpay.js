const logger = require('../utils/logger');
const Razorpay = require('razorpay');

// Initialize Razorpay instance only if credentials are provided
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  logger.info('✅ Razorpay initialized successfully');
} else {
  logger.info('⚠️  Razorpay UPI payments disabled (credentials not configured)');
  logger.info('💰 Cash payments are fully functional');
  logger.info('📝 To enable UPI: Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file');
  
  // Create a mock object for development
  razorpay = {
    orders: {
      create: () => {
        throw new Error('Razorpay not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.');
      }
    },
    payments: {
      fetch: () => {
        throw new Error('Razorpay not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.');
      }
    }
  };
}

module.exports = razorpay;