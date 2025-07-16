const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import configurations
require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://10.178.165.20:5173', // Your Ubuntu PC's network IP (dev server)
  'http://10.178.165.20:4173', // Your Ubuntu PC's network IP (preview server)
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🔧 CORS Configuration:');
console.log('📍 Allowed Origins:', allowedOrigins);
console.log('🌐 FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('🏗️ NODE_ENV:', process.env.NODE_ENV);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  // Use a proper session store in production
  ...(process.env.NODE_ENV === 'production' && {
    // Note: For production, consider using connect-mongo or similar
    // This is a temporary fix to reduce the warning
  })
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/member', require('./routes/member'));
app.use('/api/booking', require('./routes/booking'));

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
      'POST /api/auth/verify-otp'
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Network Access:`);
  console.log(`   Frontend (dev):     http://10.178.165.20:5173`);
  console.log(`   Frontend (preview): http://10.178.165.20:4173`);
  console.log(`   Backend:            http://10.178.165.20:${PORT}/api`);
});