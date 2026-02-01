const { body, param, query, validationResult } = require('express-validator');

// Validation middleware factory
const validateRequest = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  };
};

// Common validation rules
const validations = {
  // User validations
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  phoneNumber: body('phoneNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian mobile number'),
  
  otp: body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  
  // Tour validations
  tourRequest: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('phoneNumber')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit Indian mobile number'),
    
    body('preferredDate')
      .isISO8601()
      .withMessage('Please provide a valid date'),
    
    body('preferredTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Please provide a valid time in HH:MM format'),
    
    body('purpose')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Purpose must not exceed 200 characters')
  ],
  
  // Booking validations
  bookingDate: body('bookingDate')
    .isISO8601()
    .withMessage('Please provide a valid booking date'),
  
  seatType: body('seatType')
    .isIn['regular', 'premium', 'executive']
    .withMessage('Seat type must be one of: regular, premium, executive'),
  
  numberOfSeats: body('numberOfSeats')
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of seats must be between 1 and 10'),
  
  // Payment validations
  amount: body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  paymentId: body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required'),
  
  // ID parameter validations
  mongoId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  mongoIdQuery: query('id')
    .isMongoId()
    .withMessage('Invalid ID format')
};

module.exports = {
  validateRequest,
  validations
};