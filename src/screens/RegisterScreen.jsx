import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, Calendar } from 'lucide-react';
import apiService from '../services/api';
import CongratulationsScreen from './CongratulationsScreen';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import CustomDropdown from '../components/CustomDropdown';

export default function RegisterScreen({ onNavigateToLogin, onNavigateToCongratulations }) {
  // Registration steps: 'email', 'otp', 'profile', 'congratulations'
  const [currentStep, setCurrentStep] = useState('profile');
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    fullName: '',
    countryCode: '+1',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    password: '',
    confirmPassword: '',
    profilePicture: null,
    profilePictureBase64: null
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
        // Redirect to dashboard or show success message
        // You can redirect to dashboard here
      }
    }
  }, []);

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

  const validateFullName = (fullName) => {
    if (!fullName) {
      return 'Full name is required';
    }
    if (fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters long';
    }
    if (fullName.trim().length > 100) {
      return 'Full name is too long (maximum 100 characters)';
    }
    if (!/^[a-zA-Z\s'-.]+$/.test(fullName.trim())) {
      return 'Full name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    if (fullName.trim().split(/\s+/).length < 2) {
      return 'Please enter your first and last name';
    }
    return '';
  };

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) {
      return 'Phone number is required';
    }
    if (phoneNumber.length < 10) {
      return 'Phone number must be at least 10 digits long';
    }
    if (phoneNumber.length > 15) {
      return 'Phone number is too long (maximum 15 digits)';
    }
    if (!/^\d+$/.test(phoneNumber)) {
      return 'Phone number must contain only numbers (0-9)';
    }
    if (phoneNumber.startsWith('0')) {
      return 'Phone number should not start with 0 (country code is already selected)';
    }
    return '';
  };

  const validateDateOfBirth = (dob) => {
    if (!dob) {
      return 'Date of birth is required';
    }
    const today = new Date();
    const birthDate = new Date(dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 13) {
      return 'You must be at least 13 years old';
    }
    if (age > 120) {
      return 'Please enter a valid date of birth';
    }
    return '';
  };

  const validateGender = (gender) => {
    if (!gender) {
      return 'Please select your gender';
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
    if (confirmPassword.length === 0) {
      return 'Confirm password field cannot be empty';
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
      // Check if email is already registered
      const emailCheckResponse = await apiService.checkEmailExists(formData.email);
      
      if (emailCheckResponse.exists) {
        setErrors({ email: 'The email already exists' });
        setIsLoading(false);
        return;
      }

      // Send OTP to email
      const response = await apiService.sendOtp(formData.email);
      
      if (response.success) {
        setCurrentStep('otp');
        setOtpTimer(60); // 60 seconds timer
        // OTP sent successfully - user will see the step change
      } else {
        setErrors({ general: response.message || 'Failed to send verification code. Please check your email address and try again.' });
      }
    } catch (error) {
      if (error.message && error.message.includes('already registered')) {
        setErrors({ email: 'The email already exists' });
      } else if (error.message && error.message.includes('network')) {
        setErrors({ general: 'Network error. Please check your internet connection and try again.' });
      } else {
        setErrors({ general: 'Unable to send verification code. Please try again in a few moments.' });
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
      const response = await apiService.verifyOtp(formData.email, formData.otp);
      
      if (response.success) {
        setCurrentStep('profile');
        // Email verified successfully - user will see the step change
      } else {
        setErrors({ general: response.message || 'Invalid OTP. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Invalid OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;

    setIsLoading(true);
    try {
      const response = await apiService.sendOtp(formData.email);
      
      if (response.success) {
        setOtpTimer(60);
        // OTP resent successfully - timer will restart
      } else {
        setErrors({ general: response.message || 'Failed to resend OTP. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to resend OTP. Please try again.' });
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
        case 'fullName':
          error = validateFullName(value);
          break;
        case 'phoneNumber':
          error = validatePhoneNumber(value);
          break;
        case 'dateOfBirth':
          error = validateDateOfBirth(value);
          break;
        case 'gender':
          error = validateGender(value);
          break;
        case 'password':
          error = validatePassword(value);
          // Also revalidate confirm password if it's been touched
          if (touched.confirmPassword) {
            const confirmError = validateConfirmPassword(formData.confirmPassword, value);
            setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
          }
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(value, formData.password);
          break;
        default:
          break;
      }
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Handle file change for profile picture
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      // Handle case where no file is selected
      setFormData(prev => ({ 
        ...prev, 
        profilePicture: null,
        profilePictureBase64: null
      }));
      return;
    }
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profilePicture: 'Please select a valid image file' }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profilePicture: 'File size must be less than 5MB' }));
        return;
      }
      
      // Clear errors first
      setErrors(prev => ({ ...prev, profilePicture: '' }));
      
      // Set file info immediately
      setFormData(prev => ({ 
        ...prev, 
        profilePicture: file,
        profilePictureBase64: null
      }));
      
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        setFormData(prev => ({ 
          ...prev, 
          profilePictureBase64: base64Data
        }));
        // Also store in localStorage for dashboard access
        localStorage.setItem('registrationProfilePicture', base64Data);
        console.log('Profile picture saved to localStorage');
      };
      reader.readAsDataURL(file);
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
      case 'fullName':
        error = validateFullName(formData.fullName);
        break;
      case 'phoneNumber':
        error = validatePhoneNumber(formData.phoneNumber);
        break;
      case 'dateOfBirth':
        error = validateDateOfBirth(formData.dateOfBirth);
        break;
      case 'gender':
        error = validateGender(formData.gender);
        break;
      case 'password':
        error = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.confirmPassword, formData.password);
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Validate entire form for profile completion
  const validateProfileForm = () => {
    const fullNameError = validateFullName(formData.fullName);
    const phoneNumberError = validatePhoneNumber(formData.phoneNumber);
    const dateOfBirthError = validateDateOfBirth(formData.dateOfBirth);
    const genderError = validateGender(formData.gender);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    
    const newErrors = {
      fullName: fullNameError,
      phoneNumber: phoneNumberError,
      dateOfBirth: dateOfBirthError,
      gender: genderError,
      password: passwordError,
      confirmPassword: confirmPasswordError
    };
    
    setErrors(newErrors);
    setTouched({ 
      fullName: true,
      phoneNumber: true,
      dateOfBirth: true,
      gender: true,
      password: true, 
      confirmPassword: true 
    });
    
    return !fullNameError && !phoneNumberError && !dateOfBirthError && !genderError && !passwordError && !confirmPasswordError;
  };

  const handleRegister = async () => {
    if (!validateProfileForm()) {
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({ ...prev, general: '' }));
    
    try {
      // Check if phone number is already registered
      const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
      const phoneCheckResponse = await apiService.checkPhoneExists(fullPhoneNumber);
      if (phoneCheckResponse.exists) {
        setErrors({ phoneNumber: 'This phone number is already registered with another account. Please use a different phone number.' });
        setIsLoading(false);
        return;
      }

      const registrationData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: fullPhoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender
      };

      const response = await apiService.register(registrationData);
      
      if (response.success) {
        // Store the complete user data including Dyanpitt ID and profile picture
        const completeUserData = {
          ...registrationData,
          dyanpittId: response.user.dyanpittId,
          profilePicture: formData.profilePictureBase64
        };

        // Store in localStorage for dashboard access
        localStorage.setItem('userData', JSON.stringify(completeUserData));


        // Navigate to congratulations screen using the new navigation prop
        if (onNavigateToCongratulations) {
          onNavigateToCongratulations(completeUserData);
        } else {
          // Fallback to internal state
          setCurrentStep('congratulations');
          setFormData(prev => ({ ...prev, dyanpittId: response.user.dyanpittId }));
        }
      } else {
        setErrors({ general: response.message || 'Registration failed. Please try again.' });
      }
      
    } catch (error) {
      if (error.message && error.message.includes('phone number already exists')) {
        setErrors({ phoneNumber: 'This phone number is already registered. Please use a different number.' });
      } else if (error.message && error.message.includes('email already exists')) {
        setErrors({ general: 'This email is already registered. Please sign in instead.' });
      } else {
        setErrors({ 
          general: error.message || 'Registration failed. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleSignIn = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    }
  };


  // Render different steps
  const renderEmailStep = () => (
    <div className="main-container">
      <div className="header-section">
        <h1 className="main-title">Create your Account</h1>
      </div>

      {errors.general && (
        <div className="error-message general-error">
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
        className={`login-button ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner"></div>
            Sending OTP...
          </>
        ) : (
          'Send OTP'
        )}
      </button>


      <div className="signup-link">
        <p className="signup-text">
          Already have an account?{' '}
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
        <label className="input-label">Enter your OTP</label>
        <input
          type="text"
          placeholder="Enter 6-digit OTP"
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
        className={`login-button ${isLoading ? 'loading' : ''}`}
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
          {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Didn\'t receive OTP?'}
        </span>
        <button 
          onClick={handleResendOtp} 
          className="forgot-password"
          disabled={isLoading || otpTimer > 0}
        >
          Resend OTP
        </button>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="main-container profile-completion-form">
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
        <h1 className="main-title">Complete your Profile</h1>
        <p className="main-subtitle">Fill in your details to complete registration</p>
      </div>

      {errors.general && (
        <div className="error-message general-error">
          {errors.general}
        </div>
      )}

      {/* Profile Picture */}
      <div className="input-group">
        <div className="profile-picture-upload">
          <div className="profile-picture-square">
            {formData.profilePictureBase64 ? (
              <img 
                src={formData.profilePictureBase64} 
                alt="Profile Preview" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '20px'
                }}
              />
            ) : (
              formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'U'
            )}
          </div>
        </div>
      </div>

      {/* Profile Picture Upload */}
      <div className="input-group">
        <label className="input-label">
          Upload Profile Picture
        </label>
        <div className="file-upload-container">
          <input
            type="file"
            name="profilePicture"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input-hidden"
            id="profilePicture"
            key={formData.profilePicture ? formData.profilePicture.name : 'no-file'}
          />
          <label 
            htmlFor="profilePicture" 
            className={`file-upload-button ${errors.profilePicture ? 'input-error' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            {formData.profilePicture ? 'Change Picture' : 'Upload Profile Picture'}
          </label>
          {formData.profilePicture && (
            <div className="file-preview">
              <span className="file-name">Image: {formData.profilePicture.name}</span>
            </div>
          )}
        </div>
        {errors.profilePicture && <span className="error-message">{errors.profilePicture}</span>}
      </div>

      {/* Email (Pre-filled with checkmark) */}
      <div className="input-group">
        <label className="input-label">Email Address</label>
        <div className="verified-input-wrapper">
          <input
            type="email"
            value={formData.email}
            className="form-input verified-input"
            disabled
          />
          <div className="verified-icon">
            <Check size={20} color="#10b981" />
          </div>
        </div>
      </div>

      {/* Full Name */}
      <div className="input-group">
        <label className="input-label">Full Name</label>
        <input
          type="text"
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={(e) => handleInputChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          className={`form-input ${errors.fullName ? 'input-error' : ''}`}
          disabled={isLoading}
        />
        {errors.fullName && (
          <div className="error-message">
            {errors.fullName}
          </div>
        )}
      </div>

      {/* Mobile Number */}
      <div className="input-group">
        <label className="input-label">Mobile Number</label>
        <div className="phone-input-wrapper">
          <select
            value={formData.countryCode}
            onChange={(e) => handleInputChange('countryCode', e.target.value)}
            className="country-code-select"
            disabled={isLoading}
          >
            <option value="+1">+1</option>
            <option value="+44">+44</option>
            <option value="+91">+91</option>
            <option value="+86">+86</option>
            <option value="+81">+81</option>
            <option value="+49">+49</option>
            <option value="+33">+33</option>
            <option value="+39">+39</option>
            <option value="+34">+34</option>
            <option value="+7">+7</option>
          </select>
          <input
            type="tel"
            placeholder="Phone number"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
            onBlur={() => handleBlur('phoneNumber')}
            className={`form-input phone-number-input ${errors.phoneNumber ? 'input-error' : ''}`}
            disabled={isLoading}
          />
        </div>
        {errors.phoneNumber && (
          <div className="error-message">
            {errors.phoneNumber}
          </div>
        )}
      </div>

      {/* Date of Birth */}
      <div className="input-group">
        <label className="input-label">Date of Birth</label>
        <input
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
          onBlur={() => handleBlur('dateOfBirth')}
          className={`form-input ${errors.dateOfBirth ? 'input-error' : ''}`}
          disabled={isLoading}
          max={new Date().toISOString().split('T')[0]}
        />
        {errors.dateOfBirth && (
          <div className="error-message">
            {errors.dateOfBirth}
          </div>
        )}
      </div>

      {/* Gender */}
      <div className="input-group">
        <label className="input-label">Gender</label>
        <CustomDropdown
          name="gender"
          value={formData.gender}
          onChange={(e) => handleInputChange('gender', e.target.value)}
          onBlur={() => handleBlur('gender')}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
            { value: 'prefer-not-to-say', label: 'Prefer not to say' }
          ]}
          placeholder="Select your gender"
          className="form-input"
          error={errors.gender}
          disabled={isLoading}
        />
        {errors.gender && (
          <div className="error-message">
            {errors.gender}
          </div>
        )}
      </div>

      {/* Password */}
      <div className="input-group">
        <label className="input-label">Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
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
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      {/* Confirm Password */}
      <div className="input-group">
        <label className="input-label">Confirm Password</label>
        <div className="password-wrapper">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
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
        onClick={handleRegister} 
        className={`login-button ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner"></div>
            Creating Account...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );

  // Main render based on current step
  return (
    <>
      {currentStep === 'email' && renderEmailStep()}
      {currentStep === 'otp' && renderOtpStep()}
      {currentStep === 'profile' && renderProfileStep()}
    </>
  );
}