const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }


    req.user = { 
      userId: user._id, 
      dyanpittId: user.dyanpittId,
      email: user.email,
      ...decoded 
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Middleware to check if user is admin (enhanced)
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin()) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Add admin user to request for easy access
    req.adminUser = user;
    next();
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin status'
    });
  }
};

// Middleware to bypass membership/booking requirements for admins
const allowAdminBypass = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user && user.isAdmin()) {
      // Admin users bypass membership/booking requirements
      req.isAdmin = true;
      return next();
    }
    next();
  } catch {
    // If error checking admin status, continue with normal flow
    next();
  }
};

// Rate limiting middleware for auth routes
// Industry-standard rate limiting decorator for sensitive endpoints
// Defaults: 5 attempts per 15 minutes
const rateLimitAuth = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    for (const [attemptKey, attemptTime] of attempts.entries()) {
      if (attemptTime < windowStart) {
        attempts.delete(attemptKey);
      }
    }

    // Count attempts in current window
    let attemptCount = 0;
    for (const [attemptKey, attemptTime] of attempts.entries()) {
      if (attemptKey.startsWith(key) && attemptTime >= windowStart) {
        attemptCount++;
      }
    }

    if (attemptCount >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Record this attempt
    attempts.set(`${key}-${now}`, now);
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  allowAdminBypass,
  rateLimitAuth
};