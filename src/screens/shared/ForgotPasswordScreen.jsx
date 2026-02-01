import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
import logger from '../../utils/logger';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  
  // Password reset steps: 'email', 'otp', 'reset'
  const [currentStep, setCurrentStep] = useState('email');
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  
  // Validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // OTP Timer effect
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email address is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address (e.g., user@example.com)';
    }
    if (email.length > 254) {
      return 'Email address is too long (maximum 254 characters)';
    }
    return '';
  };

  const validateOtp = (otp) => {
    if (!otp) {
      return 'Verification code is required';
    }
    if (otp.length < 6) {
      return 'Please enter the complete 6-digit verification code';
    }
    if (otp.length > 6) {
      return 'Verification code must be exactly 6 digits';
    }
    if (!/^\d+$/.test(otp)) {
      return 'Verification code must contain only numbers (0-9)';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match. Please make sure both passwords are identical';
    }
    return '';
  };

  // Step handlers
  const handleSendOtp = async () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors({ email: emailError });
      setTouched({ email: true });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiService.forgotPassword(formData.email);
      
      if (response.success) {
        setCurrentStep('otp');
        setOtpTimer(60); // 60 seconds timer
      } else {
        setErrors({ general: response.message || 'Failed to send reset code. Please check your email address and try again.' });
      }
    } catch (error) {
      logger.error('Error in handleSendOtp (forgot password):', error);
      if (error.message && error.message.includes('not found')) {
        setErrors({ email: 'No account found with this email address' });
      } else if (error.message && (error.message.includes('network') || error.message.includes('Network error'))) {
        setErrors({ general: 'Network error. Please check your internet connection and try again.' });
      } else if (error.message && error.message.includes('timeout')) {
        setErrors({ general: 'Request timed out. Please check your connection and try again.' });
      } else {
        setErrors({ general: error.message || 'Unable to send reset code. Please try again in a few moments.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpError = validateOtp(formData.otp);
    if (otpError) {
      setErrors({ otp: otpError });
      setTouched({ otp: true });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiService.verifyResetOtp(formData.email, formData.otp);
      
      if (response.success) {
        setCurrentStep('reset');
        // Success feedback through step change
      } else {
        setErrors({ general: response.message || 'Invalid verification code. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Invalid verification code. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;

    setIsLoading(true);
    try {
      const response = await apiService.forgotPassword(formData.email);
      
      if (response.success) {
        setOtpTimer(60);
        // Success feedback through timer restart
      } else {
        setErrors({ general: response.message || 'Failed to resend verification code. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to resend verification code. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passwordError = validatePassword(formData.newPassword);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.newPassword);
    
    if (passwordError || confirmPasswordError) {
      setErrors({
        newPassword: passwordError,
        confirmPassword: confirmPasswordError
      });
      setTouched({ newPassword: true, confirmPassword: true });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiService.resetPassword(formData.email, formData.otp, formData.newPassword);
      
      if (response.success) {
        // Show success message and redirect to login
        setErrors({ general: 'Password reset successful! You can now sign in with your new password.' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setErrors({ general: response.message || 'Failed to reset password. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to reset password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes with validation
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
    
    if (touched[field]) {
      let error = '';
      switch (field) {
        case 'email':
          error = validateEmail(value);
          break;
        case 'otp':
          error = validateOtp(value);
          break;
        case 'newPassword':
          error = validatePassword(value);
          // Also revalidate confirm password if it's been touched
          if (touched.confirmPassword) {
            const confirmError = validateConfirmPassword(formData.confirmPassword, value);
            setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
          }
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(value, formData.newPassword);
          break;
        default:
          break;
      }
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Handle field blur (when user leaves the field)
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    let error = '';
    switch (field) {
      case 'email':
        error = validateEmail(formData.email);
        break;
      case 'otp':
        error = validateOtp(formData.otp);
        break;
      case 'newPassword':
        error = validatePassword(formData.newPassword);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword, formData.newPassword);
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  // Render different steps
  const renderEmailStep = () => (
    <div className="main-container">
      <div className="header-section">
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
        <h1 className="main-title">Reset your Password</h1>
        <p className="main-subtitle">Enter your email address and we'll send you a verification code</p>
      </div>

      {errors.general && (
        <div className={`error-message general-error ${errors.general.includes('successful') ? 'success-message' : ''}`}>
          {errors.general}
        </div>
      )}

      <div className="input-group">
        <label className="input-label">Email Address</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          onKeyPress={(e) => e.key === 'Enter' && handleSendOtp()}
          className={`form-input ${errors.email ? 'input-error' : ''}`}
          disabled={isLoading}
        />
        {errors.email && (
          <div className="error-message">
            {errors.email}
          </div>
        )}
      </div>

      <button 
        onClick={handleSendOtp} 
        className="login-button"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner"></div>
            Sending Code...
          </>
        ) : (
          'Send OTP'
        )}
      </button>

      <div className="signup-link">
        <p className="signup-text">
          Remember your password?{' '}
          <button onClick={handleSignIn} className="signup-button" disabled={isLoading}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );

  const renderOtpStep = () => (
    <div className="main-container">
      <button 
        onClick={() => setCurrentStep('email')} 
        className="back-button"
        disabled={isLoading}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="header-section">
        <h1 className="main-title">Verify your Email</h1>
        <p className="main-subtitle">Enter the 6-digit code sent to <span className="semibold-email">{formData.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}</span></p>
      </div>

      {errors.general && (
        <div className="error-message general-error">
          {errors.general}
        </div>
      )}

      <div className="input-group">
        <label className="input-label">Enter Verification Code</label>
        <input
          type="text"
          placeholder="Enter 6-digit code"
          value={formData.otp}
          onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
          onBlur={() => handleBlur('otp')}
          onKeyPress={(e) => e.key === 'Enter' && handleVerifyOtp()}
          className={`form-input ${errors.otp ? 'input-error' : ''}`}
          disabled={isLoading}
          maxLength={6}
        />
        {errors.otp && (
          <div className="error-message">
            {errors.otp}
          </div>
        )}
      </div>

      <button 
        onClick={handleVerifyOtp} 
        className="login-button"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner"></div>
            Verifying...
          </>
        ) : (
          'Verify OTP'
        )}
      </button>

      <div className="form-options">
        <span className="checkbox-label">
          {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Didn\'t receive the code?'}
        </span>
        <button 
          onClick={handleResendOtp} 
          className="forgot-password"
          disabled={isLoading || otpTimer > 0}
        >
          Resend Code
        </button>
      </div>
    </div>
  );

  const renderResetStep = () => (
    <div className="main-container">
      <button 
        onClick={() => setCurrentStep('otp')} 
        className="back-button"
        disabled={isLoading}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="header-section">
        <h1 className="main-title">Create New Password</h1>
        <p className="main-subtitle">Enter your new password below</p>
      </div>

      {errors.general && (
        <div className={`error-message general-error ${errors.general.includes('successful') ? 'success-message' : ''}`}>
          {errors.general}
        </div>
      )}

      {/* New Password */}
      <div className="input-group">
        <label className="input-label">New Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            onBlur={() => handleBlur('newPassword')}
            className={`form-input password-input ${errors.newPassword ? 'input-error' : ''}`}
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
        {errors.newPassword && (
          <div className="error-message">
            {errors.newPassword}
          </div>
        )}
        <PasswordStrengthIndicator password={formData.newPassword} />
      </div>

      {/* Confirm Password */}
      <div className="input-group">
        <label className="input-label">Confirm New Password</label>
        <div className="password-wrapper">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
            className={`form-input password-input ${errors.confirmPassword ? 'input-error' : ''}`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="password-toggle"
            disabled={isLoading}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <div className="error-message">
            {errors.confirmPassword}
          </div>
        )}
      </div>

      <button 
        onClick={handleResetPassword} 
        className="login-button"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner"></div>
            Resetting Password...
          </>
        ) : (
          'Reset Password'
        )}
      </button>
    </div>
  );

  // Main render based on current step
  return (
    <>
      {currentStep === 'email' && renderEmailStep()}
      {currentStep === 'otp' && renderOtpStep()}
      {currentStep === 'reset' && renderResetStep()}
    </>
  );
}