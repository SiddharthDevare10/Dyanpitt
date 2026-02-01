const logger = require('../utils/logger');
const mongoose = require('mongoose');

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      retryWrites: true,
      w: 'majority'
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.info('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('🛑 Shutting down MongoDB connection...');
      try {
        await mongoose.connection.close();
        logger.info('✅ MongoDB connection closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    return conn;

  } catch (error) {
    logger.error(`❌ MongoDB connection attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < maxRetries) {
      logger.info(`🔄 Retrying MongoDB connection in ${retryDelay / 1000} seconds... (Attempt ${retryCount + 2}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDB(retryCount + 1);
    } else {
      logger.error('❌ Max retry attempts reached. Unable to connect to MongoDB.');
      logger.error('Please check:');
      logger.error('   1. MongoDB is running');
      logger.error('   2. MONGODB_URI is correct');
      logger.error('   3. Network connectivity');
      process.exit(1);
    }
  }
};

module.exports = connectDB;