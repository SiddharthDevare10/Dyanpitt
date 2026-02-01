import { useState, useEffect } from 'react';
import DatePicker from '../../components/DatePicker';
import { Eye, EyeOff, Check, Calendar } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import logger from '../../utils/logger';
// import { useAuth } from '../../contexts/AuthContext.jsx'; - Currently unused
import CongratulationsScreen from '../user/CongratulationsScreen';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator';
import CustomDropdown from '../../components/CustomDropdown';
import apiService from '../../services/api';

export default function RegisterScreen() {
  const navigate = useNavigate();
  // const { user } = useAuth(); - Currently unused
  
  // Registration steps: 'email', 'otp', 'profile', 'congratulations'
  const [currentStep, setCurrentStep] = useState('email');
  
  const [formData, setFormData] = useState(() => {
    // Always start with fresh data - clear any previous registration attempts
    sessionStorage.removeItem('registrationFormData');
    return {
      email: '',
      otp: '',
      fullName: '',
      countryCode: '+91', // Fixed to India format
      phoneNumber: '',
      dateOfBirth: '',
      gender: '',
      currentAddress: '',
      password: '',
      confirmPassword: '',
      profilePicture: null,
      profilePictureBase64: null
    };
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  
  // Validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showTourIndicator, setShowTourIndicator] = useState(false);
  const [tourDataChecked, setTourDataChecked] = useState(false);

  // OTP Timer effect
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    // Cleanup interval to prevent memory leaks
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [otpTimer]);

  // Auto-check for tour data when user reaches profile step
  useEffect(() => {
    const checkForTourData = async () => {
      // Only check when on profile step and haven't checked yet
      if (currentStep !== 'profile' || tourDataChecked) {
        return;
      }

      try {
        setTourDataChecked(true);
        await fetchAndPopulateTourData(formData.email);
      } catch (error) {
        logger.error('Error auto-checking tour data:', error);
      }
    };

    checkForTourData();
  }, [currentStep, tourDataChecked, formData.email]);

  // Check for OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Handle OAuth callback
      // Handle OAuth callback - using navigate instead
      // Clear URL parameters and redirect
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/dashboard');
    }
  }, [navigate]);

  // Clear sessionStorage when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Only clear if user is not in the middle of active registration flow
      // Check if user is currently in email step with no data, or completely left registration
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/register') && !currentPath.includes('/login')) {
        sessionStorage.removeItem('registrationFormData');
      }
    };
  }, []);

  // Function to reset form data completely (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const resetFormData = () => {
    const emptyFormData = {
      email: '',
      otp: '',
      fullName: '',
      countryCode: '+91',
      phoneNumber: '',
      dateOfBirth: '',
      gender: '',
      password: '',
      confirmPassword: '',
      profilePicture: null,
      profilePictureBase64: null
    };
    setFormData(emptyFormData);
    sessionStorage.removeItem('registrationFormData');
    setCurrentStep('email');
    setErrors({});
    setTouched({});
    setShowTourIndicator(false);
    setTourDataChecked(false);
  };

  const fetchAndPopulateTourData = async (email) => {
    try {
      if (!email) {
        return;
      }
      
      // Fetch tour requests for this email
      let result;
      try {
        result = await apiService.request(`/tour/requests/${encodeURIComponent(email)}`);
      } catch (error) {
        logger.warn('Failed to fetch tour requests:', error);
        return;
      }
      
      if (result.success && result.data && result.data.length > 0) {
        // Get the most recent tour request
        const latestTour = result.data[0];
        
        // Pre-populate matching fields only if they're not already filled
        setFormData(prev => ({
          ...prev,
          fullName: prev.fullName || latestTour.fullName || '',
          gender: prev.gender || latestTour.gender || ''
        }));

        // Set indicator for tour data found
        setShowTourIndicator(true);

        // Hide indicator after 5 seconds
        setTimeout(() => {
          setShowTourIndicator(false);
        }, 5000);

        // Show success message in console
        // Tour data fetched successfully
      } else {
        // No tour data found
      }
      
    } catch (error) {
      logger.error('Error fetching tour data:', error);
      // Don't show error to user, just log it
    }
  };

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
    if (phoneNumber.length !== 10) {
      return 'Phone number must be exactly 10 digits long';
    }
    if (!/^\d+$/.test(phoneNumber)) {
      return 'Phone number must contain only numbers (0-9)';
    }
    if (!/^[6-9]/.test(phoneNumber)) {
      return 'Phone number must start with 6, 7, 8, or 9 (valid Indian mobile numbers)';
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
    
    if (age < 12) {
      return 'You must be at least 12 years old';
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

  const validateCurrentAddress = (address) => {
    if (!address) return 'Current address is required';
    if (address.length < 10) return 'Address must be at least 10 characters';
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
      // Send OTP to email (this will also check if email exists)
      const response = await apiService.sendOtp(formData.email);
      
      if (response.success) {
        setCurrentStep('otp');
        setOtpTimer(60); // 60 seconds timer
      } else {
        setErrors({ general: response.message || 'Failed to send verification code. Please check your email address and try again.' });
      }
    } catch (error) {
      logger.error('Error in handleSendOtp:', error);
      
      let errorMessage = 'Unable to send verification code. Please try again in a few moments.';
      
      if (error.message && error.message.includes('already registered')) {
        setErrors({ email: 'The email already exists' });
        setIsLoading(false);
        return;
      } else if (error.message && error.message.includes('already exists')) {
        setErrors({ email: 'The email already exists' });
        setIsLoading(false);
        return;
      } else if (error.message && (error.message.includes('network') || error.message.includes('Network error'))) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Connection timed out. Please check your internet connection and try again.';
      } else if (error.message && error.message.includes('Email sending timeout')) {
        errorMessage = 'Email service is taking longer than expected. The OTP may still be sent to your email. Please check your inbox or try again in a few moments.';
      } else if (error.message && error.message.includes('SMTP')) {
        errorMessage = 'Email service temporarily unavailable. Please try again in a few moments.';
      } else if (error.message && error.message.includes('EMAIL_SEND_FAILED')) {
        errorMessage = 'Failed to send OTP email. Please check your email address and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ general: errorMessage });
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
      
      const response = await apiService.verifyOtp({ email: formData.email, otp: formData.otp });
      
      if (response.success) {
        setCurrentStep('profile');
        // Email verified successfully - user will see the step change
      } else {
        setErrors({ general: response.message || 'Invalid OTP. Please try again.' });
      }
    } catch (error) {
      logger.error('OTP verification error:', error);
      logger.error('Error details:', error.message);
      
      // Try to get more specific error from response
      if (error.message && error.message.includes('Validation failed')) {
        setErrors({ otp: 'Please enter a valid 6-digit OTP (numbers only)' });
      } else if (error.message && error.message.includes('Invalid OTP')) {
        setErrors({ otp: 'Invalid OTP. Please check and try again.' });
      } else if (error.message && error.message.includes('expired')) {
        setErrors({ otp: 'OTP has expired. Please request a new one.' });
      } else {
        setErrors({ general: error.message || 'Invalid OTP. Please try again.' });
      }
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

  // Handle input changes with validation - improved timing
  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Persist form data to prevent loss on page refresh
    sessionStorage.setItem('registrationFormData', JSON.stringify(newFormData));
    
    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
        case 'currentAddress':
          error = validateCurrentAddress(value);
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
        
        // Check if the base64 data is too large (> 4MB when stored)
        const sizeInBytes = base64Data.length * 0.75; // Approximate size after base64 encoding
        const maxSizeInBytes = 4 * 1024 * 1024; // 4MB limit
        
        if (sizeInBytes > maxSizeInBytes) {
          logger.error('Profile picture is too large for localStorage. Please use a smaller image.');
          setErrors(prev => ({ ...prev, profilePicture: 'Profile picture is too large. Please choose an image smaller than 4MB.' }));
          return;
        }
        
        try {
          setFormData(prev => ({ 
            ...prev, 
            profilePictureBase64: base64Data
          }));
          // Profile picture will be uploaded during registration
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            logger.error('localStorage quota exceeded.');
            setErrors(prev => ({ ...prev, profilePicture: 'Profile picture is too large for storage. Please use a smaller image.' }));
          } else {
            logger.error('Error saving profile picture:', error);
            setErrors(prev => ({ ...prev, profilePicture: 'Error saving profile picture. Please try again.' }));
          }
        }
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
      case 'currentAddress':
        error = validateCurrentAddress(formData.currentAddress);
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
    const currentAddressError = validateCurrentAddress(formData.currentAddress);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    
    const newErrors = {
      fullName: fullNameError,
      phoneNumber: phoneNumberError,
      dateOfBirth: dateOfBirthError,
      gender: genderError,
      currentAddress: currentAddressError,
      password: passwordError,
      confirmPassword: confirmPasswordError
    };
    
    setErrors(newErrors);
    setTouched({ 
      fullName: true,
      phoneNumber: true,
      dateOfBirth: true,
      gender: true,
      currentAddress: true,
      password: true, 
      confirmPassword: true 
    });
    
    return !fullNameError && !phoneNumberError && !dateOfBirthError && !genderError && !currentAddressError && !passwordError && !confirmPasswordError;
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
        phoneNumber: `+91${formData.phoneNumber}`,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        currentAddress: formData.currentAddress
      };

      // Add avatar file if selected
      if (formData.profilePicture instanceof File) {
        registrationData.avatar = formData.profilePicture;
      }

      const response = await apiService.register(registrationData);
      
      if (response.success) {
        // Registration completed successfully - no Dyanpitt ID yet
        // User will get Dyanpitt ID after completing membership and payment
        
        // Clear form data from sessionStorage since registration is complete
        sessionStorage.removeItem('registrationFormData');
        
        // Don't auto-login for security reasons
        // User should manually log in after registration
        
        // Show congratulations screen instead of alert
        setCurrentStep('congratulations');
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
    navigate('/login');
  };


  // Render different steps
  const renderEmailStep = () => (
    <div className="main-container">
      {/* Back Button */}
      <Link to="/" className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        ← Back
      </Link>
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
        className="login-button"
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
          placeholder="XXXXXX"
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

      {/* Tour Data Indicator */}
      {showTourIndicator && (
        <div 
          className="tour-data-indicator register-tour-data-indicator"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
          Great! We found you visited Dyanpitt for a tour and pre-populated your name and gender from the Tour Details.
        </div>
      )}

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
                className="register-profile-preview-image"
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
          <div className="country-code-display">+91</div>
          <input
            type="tel"
            placeholder="Enter 10-digit mobile number"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
            onBlur={() => handleBlur('phoneNumber')}
            className={`form-input phone-number-input ${errors.phoneNumber ? 'input-error' : ''}`}
            disabled={isLoading}
            maxLength={10}
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
        <DatePicker
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
          className={errors.dateOfBirth ? 'input-error' : ''}
          error={!!errors.dateOfBirth}
          placeholder="e.g., March 15, 1995"
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

      {/* Current Address */}
      <div className="input-group">
        <label className="input-label">Current Address</label>
        <textarea
          name="currentAddress"
          placeholder="Enter your current address"
          value={formData.currentAddress}
          onChange={(e) => handleInputChange('currentAddress', e.target.value)}
          onBlur={() => handleBlur('currentAddress')}
          className={`form-input ${errors.currentAddress ? 'input-error' : ''}`}
          rows="3"
          disabled={isLoading}
        />
        {errors.currentAddress && (
          <div className="error-message">
            {errors.currentAddress}
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
        className="login-button"
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
      {currentStep === 'congratulations' && <CongratulationsScreen email={formData.email} />}
    </>
  );
}