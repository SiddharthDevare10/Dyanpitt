const logger = require('../utils/logger');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'EMAIL_VERIFICATION_SECRET',
  'SESSION_SECRET'
];

// Optional environment variables with defaults
const optionalEnvVars = {
  PORT: '5000',
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:5173'
};

// Validate required environment variables
const validateEnv = () => {
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    logger.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      logger.error(`   - ${varName}`);
    });
    logger.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  // Set optional variables with defaults
  Object.keys(optionalEnvVars).forEach(varName => {
    if (!process.env[varName]) {
      process.env[varName] = optionalEnvVars[varName];
    }
  });
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
  }
  
  if (process.env.EMAIL_VERIFICATION_SECRET && process.env.EMAIL_VERIFICATION_SECRET.length < 32) {
    logger.warn('⚠️  EMAIL_VERIFICATION_SECRET should be at least 32 characters long for security');
  }
  
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    logger.warn('⚠️  SESSION_SECRET should be at least 32 characters long for security');
  }
  
  // Validate MongoDB URI format
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    logger.error('❌ MONGODB_URI must start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }
  
  logger.info('✅ Environment variables validated successfully');
};

module.exports = {
  validateEnv,
  requiredEnvVars,
  optionalEnvVars
};