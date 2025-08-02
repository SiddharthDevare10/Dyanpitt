import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/api';

export default function LoginScreen({ onNavigateToRegister, onNavigateToForgotPassword, onNavigateBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Check for OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Handle OAuth callback
      const success = apiService.handleOAuthCallback(token);
      if (success) {
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        // Check completion status and redirect accordingly
        window.location.href = '/dashboard';
      }
    }
  }, []);

  // Validation functions
  const validateEmailOrId = (emailOrId) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const dyanpittIdRegex = /^@DA\d{9}$/;
    
    if (!emailOrId) {
      return 'Email address or Dyanpitt ID is required';
    }
    
    if (emailOrId.trim().length === 0) {
      return 'Please enter your email address or Dyanpitt ID';
    }
    
    // Check if it's a Dyanpitt ID
    if (emailOrId.startsWith('@DA')) {
      if (!dyanpittIdRegex.test(emailOrId)) {
        return 'Invalid Dyanpitt ID format. Should be @DA followed by 9 digits (e.g., @DA202507001)';
      }
      return '';
    }
    
    // Check if it's an email
    if (emailOrId.includes('@')) {
      if (!emailRegex.test(emailOrId)) {
        return 'Please enter a valid email address (e.g., user@example.com)';
      }
      if (emailOrId.length > 254) {
        return 'Email address is too long (maximum 254 characters)';
      }
      return '';
    }
    
    // If it doesn't start with @DA and doesn't contain @, it's invalid
    return 'Please enter a valid email address or Dyanpitt ID (starts with @DA)';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  };

  // Handle input changes with validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
    
    if (touched.email) {
      const error = validateEmailOrId(value);
      setErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    
    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
    
    if (touched.password) {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  // Handle field blur (when user leaves the field)
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'email') {
      const error = validateEmailOrId(email);
      setErrors(prev => ({ ...prev, email: error }));
    } else if (field === 'password') {
      const error = validatePassword(password);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  // Validate entire form
  const validateForm = () => {
    const emailError = validateEmailOrId(email);
    const passwordError = validatePassword(password);
    
    const newErrors = {
      email: emailError,
      password: passwordError
    };
    
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    
    return !emailError && !passwordError;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({ ...prev, general: '' }));
    
    try {
      // Determine if login is with email or Dyanpitt ID
      const isEmailLogin = email.includes('@') && !email.startsWith('@DA');
      const loginData = {
        [isEmailLogin ? 'email' : 'dyanpittId']: email,
        password: password,
        rememberMe: rememberMe
      };

      const response = await apiService.login(loginData);
      
      if (response.success) {
        // Store user data for the dashboard
        if (response.user) {
          localStorage.setItem('userData', JSON.stringify(response.user));
        }
        
        // Check user completion status and redirect accordingly
        const user = response.user;
        if (!user.membershipCompleted) {
          window.location.href = '/membership';
        } else if (!user.bookingCompleted) {
          window.location.href = '/booking';
        } else {
          window.location.href = '/dashboard';
        }
      }
      
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        general: error.message || 'Login failed. Please check your credentials and try again.' 
      }));
    } finally {
      setIsLoading(false);
    }
  };


  const handleSignUp = () => {
    if (onNavigateToRegister) {
      onNavigateToRegister();
    }
  };

  const handleForgotPassword = () => {
    if (onNavigateToForgotPassword) {
      onNavigateToForgotPassword();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <motion.div 
      className="main-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Back Button */}
      {onNavigateBack && (
        <button 
          onClick={onNavigateBack} 
          className="back-button"
          disabled={isLoading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {/* Header */}
      <motion.div 
        className="header-section"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="main-title">Welcome Back</h1>
        {/* Sign Up Link */}
        <div className="signup-link login-screen-signup-link">
          <p className="signup-text">
            Don't have an account?{' '}
            <motion.button 
              onClick={handleSignUp} 
              className="signup-button"
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign up
            </motion.button>
          </p>
        </div>
      </motion.div>

      {/* General Error Message */}
      {errors.general && (
        <div className="error-message general-error">
          {errors.general}
        </div>
      )}

      {/* Email Input */}
      <div className="input-group">
        <label className="input-label">Email or Dyanpitt ID</label>
        <input
          type="text"
          placeholder="Enter your email or Dyanpitt ID"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur('email')}
          onKeyPress={handleKeyPress}
          className={`form-input ${errors.email ? 'input-error' : ''}`}
          disabled={isLoading}
        />
        {errors.email && (
          <div className="error-message">
            {errors.email}
          </div>
        )}
      </div>

      {/* Password Input */}
      <div className="input-group">
        <label className="input-label">Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleBlur('password')}
            onKeyPress={handleKeyPress}
            className={`form-input password-input ${errors.password ? 'input-error' : ''}`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.password && (
          <div className="error-message">
            {errors.password}
          </div>
        )}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="form-options">
        <label className="remember-me">
          <input 
            type="checkbox" 
            className="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <span className="checkbox-label">Remember me</span>
        </label>
        <button 
          onClick={handleForgotPassword} 
          className="forgot-password"
          disabled={isLoading}
        >
          Forgot Password?
        </button>
      </div>

      {/* Login Button */}
      <motion.button 
        onClick={handleLogin} 
        className={`login-button ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <>
            <div className="spinner"></div>
            Signing In...
          </>
        ) : (
          'Sign In'
        )}
      </motion.button>

    </motion.div>
  );
}

