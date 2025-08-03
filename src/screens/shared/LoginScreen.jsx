import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
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
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Redirect to dashboard after OAuth
      navigate('/dashboard');
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

      const response = await login(loginData);
      
      if (response.success && response.user) {
        // Mark that user came from login, not registration
        sessionStorage.setItem('cameFromRegistration', 'false');
        
        const user = response.user;
        
        // Navigate based on user role and completion status
        if (user.role === 'admin' || user.role === 'super_admin') {
          navigate('/admin-dashboard');
        } else if (!user.membershipCompleted) {
          navigate('/membership');
        } else if (!user.bookingCompleted) {
          navigate('/booking');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrors(prev => ({ 
          ...prev, 
          general: response.message || 'Login failed. Please check your credentials and try again.' 
        }));
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
    navigate('/register');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <motion.div 
      className="main-container login-screen-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Back Button */}
      <Link to="/" className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        ← Back
      </Link>
      {/* Header */}
      <motion.div 
        className="header-section login-screen-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="main-title login-screen-title">Welcome Back</h1>
        {/* Don't have an account? Sign up */}
        <div className="login-dont-have-account">
          <p>
            Don't have an account?{' '}
            <motion.button 
              onClick={handleSignUp} 
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
        <div className="error-message general-error login-screen-general-error">
          {errors.general}
        </div>
      )}

      {/* Email Input */}
      <div className="input-group login-screen-input-group">
        <label className="input-label login-screen-input-label">Email or Dyanpitt ID</label>
        <input
          type="text"
          placeholder="Enter your email or Dyanpitt ID"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur('email')}
          onKeyPress={handleKeyPress}
          className={`form-input login-screen-form-input ${errors.email ? 'error' : ''}`}
          disabled={isLoading}
        />
        {errors.email && (
          <div className="error-message login-screen-error-message">
            {errors.email}
          </div>
        )}
      </div>

      {/* Password Input */}
      <div className="input-group login-screen-input-group">
        <label className="input-label login-screen-input-label">Password</label>
        <div className="password-wrapper login-screen-password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleBlur('password')}
            onKeyPress={handleKeyPress}
            className={`form-input login-screen-form-input login-screen-password-input ${errors.password ? 'error' : ''}`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle login-screen-password-toggle"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.password && (
          <div className="error-message login-screen-error-message">
            {errors.password}
          </div>
        )}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="form-options login-screen-form-options">
        <label className="remember-me login-screen-remember-me">
          <input 
            type="checkbox" 
            className="checkbox login-screen-checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <span className="checkbox-label">Remember me</span>
        </label>
        <button 
          onClick={handleForgotPassword} 
          className="forgot-password login-screen-forgot-password"
          disabled={isLoading}
        >
          Forgot Password?
        </button>
      </div>

      {/* Login Button */}
      <motion.button 
        onClick={handleLogin} 
        className={`login-button login-screen-submit-button ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <>
            <div className="spinner login-screen-spinner"></div>
            Signing In...
          </>
        ) : (
          'Sign In'
        )}
      </motion.button>

    </motion.div>
  );
}

