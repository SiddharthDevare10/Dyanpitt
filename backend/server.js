const express = require('express');
// Session dependencies removed - using JWT authentication only
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cleanupService = require('./services/cleanupService');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import configurations
// Passport configuration removed - using JWT middleware directly

// Import routes
const authRoutes = require('./routes/auth');

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173', // Preview server
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🔧 CORS Configuration:');
console.log('📍 Allowed Origins:', allowedOrigins);
console.log('🌐 FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('🏗️ NODE_ENV:', process.env.NODE_ENV);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(null, false); // Don't throw error, just deny
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Add debugging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.get('Origin');
  const isDev = process.env.NODE_ENV === 'development';
  const isAllowed = isDev || !origin || allowedOrigins.includes(origin);
  
  console.log('🔄 Preflight request for:', req.url, 'Origin:', origin, 'Allowed:', isAllowed);
  if (origin && isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.sendStatus(200);
});

// Security middleware (more permissive for development)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in development to avoid conflicts
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false, // Allow cross-origin requests for images
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle CORS for uploads explicitly with debugging
app.use('/uploads', (req, res, next) => {
  const origin = req.get('Origin');
  console.log(`🖼️ Upload request: ${req.method} ${req.url}, Origin: ${origin || 'none'}`);
  
  // Set specific origin instead of * to allow credentials if needed
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS preflight for uploads');
    return res.sendStatus(200);
  }
  
  // Set caching headers for images
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
});

// Serve static files (uploaded images) 
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y', // 1 year cache
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Additional headers for specific file types
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/' + path.split('.').pop());
    }
  }
}));

// Session middleware removed - using JWT authentication only

// Passport middleware
// Passport session removed - using JWT authentication only

// Connect to MongoDB
connectDB();

// Start cleanup service for temporary users (runs every 5 minutes)
cleanupService.start(5);

// Basic rate limiting for API routes (tune as needed)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tour', require('./routes/tour'));
app.use('/api/cleanup', require('./routes/cleanup'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API info route for browser testing
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Dyanpitt API is running',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        sendOtp: 'POST /api/auth/send-otp',
        verifyOtp: 'POST /api/auth/verify-otp',
        forgotPassword: 'POST /api/auth/forgot-password',
        me: 'GET /api/auth/me (requires auth)',
        logout: 'POST /api/auth/logout (requires auth)'
      },
      tour: {
        request: 'POST /api/tour/request',
        getByEmail: 'GET /api/tour/requests/:email',
        getAll: 'GET /api/tour/requests',
        updateStatus: 'PUT /api/tour/requests/:id/status'
      }
    },
    note: 'Most endpoints require POST requests with JSON data'
  });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler with debugging info
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    requestedPath: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/send-otp',
      'POST /api/auth/verify-otp',
      'POST /api/tour/request',
      'GET /api/tour/requests/:email'
    ]
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Network Access:`);
  console.log(`   Frontend (dev):     http://localhost:5173`);
  console.log(`   Frontend (preview): http://localhost:4173`);
  console.log(`   Backend:            http://localhost:${PORT}/api`);
  console.log(`🧹 Cleanup service started - temporary users will be cleaned up every 5 minutes`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  cleanupService.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  cleanupService.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});