import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import apiService from '../../services/api.js';
import logger from '../../utils/logger';

export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [navigate]);

  // Validation functions
  const validateEmailOrId = (emailOrId) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const dyanpittIdRegex = /^@DA\d{9}$/;
    
    if (!emailOrId) {
      return 'Email address or Dyanpeeth Abhyasika ID is required';
    }
    
    if (emailOrId.trim().length === 0) {
      return 'Please enter your email address or Dyanpeeth Abhyasika ID';
    }
    
    // Check if it's a Dyanpeeth Abhyasika ID
    if (emailOrId.startsWith('@DA')) {
      if (!dyanpittIdRegex.test(emailOrId)) {
        return 'Invalid Dyanpeeth Abhyasika ID format. Should be @DA followed by 9 digits (e.g., @DA202507001)';
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
    return 'Please enter a valid email address or Dyanpeeth Abhyasika ID (starts with @DA)';
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
      
      // Determine if login is with email or Dyanpeeth Abhyasika ID
      const isEmailLogin = email.includes('@') && !email.startsWith('@DA');
      const loginData = {
        [isEmailLogin ? 'email' : 'dyanpittId']: email,
        password: password,
        rememberMe: rememberMe
      };


      // Add timeout to the login request
      const loginPromise = login(loginData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - please try again')), 30000)
      );

      const response = await Promise.race([loginPromise, timeoutPromise]);
      
      
      if (response.success && response.user) {
        
        // Mark that user came from login, not registration
        sessionStorage.setItem('cameFromRegistration', 'false');
        
        const user = response.user;
        
        // Check if user came from registration
        const fromRegistration = location.state?.fromRegistration;
        
        // Navigate based on user role and completion status
        if (user.role === 'admin' || user.role === 'super_admin') {
          navigate('/admin-dashboard');
        } else if (fromRegistration) {
          // For newly registered users, go to dashboard first
          // They can choose when to start membership process
          navigate('/dashboard');
        } else if (!user.membershipCompleted) {
          navigate('/membership');
        } else {
          // Check for pending cash payment by fetching active bookings from API
          try {
            const bookingResponse = await apiService.request('/booking/user/active');
            const activeBookings = bookingResponse.success ? bookingResponse.data : [];
            const cashPendingBooking = activeBookings?.find(booking => 
              booking.paymentStatus === 'cash_pending'
            );
            
            if (cashPendingBooking) {
              // User has pending cash payment - redirect to cash payment pending screen
              navigate('/cash-payment-pending', { 
                state: { bookingData: cashPendingBooking },
                replace: true 
              });
              return;
            }
          } catch (error) {
            logger.error('Error checking booking status during login:', error);
            // If API call fails, still check bookingCompleted but be cautious
          }
          
          // No pending cash payment, proceed with normal flow
          if (!user.bookingCompleted) {
            navigate('/booking');
          } else {
            // User has completed booking, go to dashboard
            navigate('/dashboard');
          }
        }
      } else {
        setErrors(prev => ({ 
          ...prev, 
          general: response.message || 'Login failed. Please check your credentials and try again.' 
        }));
      }
      
    } catch (error) {
      logger.error('🚨 Login error:', error);
      
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Login is taking too long. Please check your connection and try again.';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({ 
        ...prev, 
        general: errorMessage
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
    <div className="main-container login-screen-container">
      {/* Back Button */}
      <Link to="/" className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        ← Back
      </Link>
      {/* Header */}
      <div className="header-section login-screen-header">
        <div className="logo-container" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="./Logo.png" 
            alt="Logo" 
            style={{ 
              width: '150px', 
              height: '150px', 
              objectFit: 'contain',
              borderRadius: '50%'
            }} 
          />
        </div>
        <h1 className="main-title login-screen-title">Welcome Back</h1>
        {/* Don't have an account? Sign up */}
        <div className="login-dont-have-account">
          <p>
            Don't have an account?{' '}
            <button 
              onClick={handleSignUp} 
              disabled={isLoading}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>

      {/* General Error Message */}
      {errors.general && (
        <div className="error-message general-error login-screen-general-error">
          {errors.general}
        </div>
      )}

      {/* Email Input */}
      <div className="input-group login-screen-input-group">
        <label className="input-label login-screen-input-label">Email or Dyanpeeth Abhyasika ID</label>
        <input
          type="text"
          placeholder="Enter your email or Dyanpeeth Abhyasika ID"
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
      <div className="input-group login-screen-input-group" style={{ marginTop: '1px' }}>
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
      <button 
        onClick={handleLogin} 
        className="login-button login-screen-submit-button"
        disabled={isLoading}
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </button>

    </div>
  );
}

