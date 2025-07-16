const mongoose = require('mongoose');

// Temporary collection to store OTP verification data
const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  otpExpiry: {
    type: Date,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  }
}, {
  timestamps: true
});

// Index for faster queries and automatic cleanup
otpVerificationSchema.index({ email: 1 });
otpVerificationSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired documents

module.exports = mongoose.model('OTPVerification', otpVerificationSchema);