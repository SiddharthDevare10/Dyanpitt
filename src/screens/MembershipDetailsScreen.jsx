import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import CustomDropdown from '../components/CustomDropdown';
import DatePicker from '../components/DatePicker';
import apiService from '../services/api';

export default function MembershipDetailsScreen({ userData, onBack, onContinue }) {
  const [formData, setFormData] = useState({
    visitedBefore: userData?.membershipDetails?.visitedBefore || '',
    fatherName: userData?.membershipDetails?.fatherName || '',
    parentContactNumber: userData?.membershipDetails?.parentContactNumber || '',
    educationalBackground: userData?.membershipDetails?.educationalBackground || '',
    currentOccupation: userData?.membershipDetails?.currentOccupation || '',
    currentAddress: userData?.membershipDetails?.currentAddress || '',
    jobTitle: userData?.membershipDetails?.jobTitle || '',
    examPreparation: userData?.membershipDetails?.examPreparation || '',
    examinationDate: userData?.membershipDetails?.examinationDate || '',
    selfiePhoto: userData?.membershipDetails?.selfiePhoto || null
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTourIndicator, setShowTourIndicator] = useState(false);
  const [tourDataChecked, setTourDataChecked] = useState(false);

  // Auto-check for tour data when component loads
  useEffect(() => {
    const checkForTourData = async () => {
      // Only check once
      if (tourDataChecked) {
        return;
      }

      try {
        setTourDataChecked(true);
        // Try to fetch tour data - the function will handle finding the email
        await fetchAndPopulateTourData(userData?.email);
      } catch (error) {
        console.error('Error auto-checking tour data:', error);
      }
    };

    checkForTourData();
  }, [tourDataChecked]); // Removed userData?.email dependency to run on mount

  const handleInputChange = async (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        
        // Clear job title if unemployed or student is selected
        if (name === 'currentOccupation' && (value === 'Unemployed' || value === 'Student')) {
          newData.jobTitle = '';
        }
        
        return newData;
      });

      // If user selects "yes" for visited before, try to fetch and populate tour data
      if (name === 'visitedBefore' && value === 'yes' && userData?.email) {
        await fetchAndPopulateTourData(userData.email);
      }
    }
    
    // Clear error when user makes a selection
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear job title error when occupation is changed to unemployed or student
    if (name === 'currentOccupation' && (value === 'Unemployed' || value === 'Student') && errors.jobTitle) {
      setErrors(prev => ({
        ...prev,
        jobTitle: ''
      }));
    }
  };

  const fetchAndPopulateTourData = async (email) => {
    try {
      setIsLoading(true);
      
      // If no email provided, try to get it from various sources
      let userEmail = email;
      if (!userEmail) {
        // Try to get email from localStorage userData
        const localUserData = localStorage.getItem('userData');
        if (localUserData) {
          try {
            const parsedData = JSON.parse(localUserData);
            userEmail = parsedData.email;
          } catch (e) {
            console.log('Could not parse localStorage userData');
          }
        }
        
        // If still no email, try to get current user from API
        if (!userEmail) {
          try {
            const currentUserResponse = await apiService.getCurrentUser();
            if (currentUserResponse.success && currentUserResponse.user?.email) {
              userEmail = currentUserResponse.user.email;
            }
          } catch (e) {
            console.log('Could not get current user email from API');
          }
        }
      }
      
      if (!userEmail) {
        console.log('No email available to check for tour data');
        return;
      }
      
      // Fetch tour requests for this email
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tour/requests/${encodeURIComponent(userEmail)}`);
      
      if (!response.ok) {
        console.log('No tour data found for this email:', userEmail);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        // Get the most recent tour request
        const latestTour = result.data[0];
        
        // Pre-populate common fields only if they're not already filled
        setFormData(prev => ({
          ...prev,
          educationalBackground: prev.educationalBackground || latestTour.educationalBackground || '',
          currentOccupation: prev.currentOccupation || latestTour.currentOccupation || '',
          jobTitle: prev.jobTitle || latestTour.jobTitle || '',
          examPreparation: prev.examPreparation || latestTour.examPreparation || '',
          examinationDate: prev.examinationDate || (latestTour.examinationDate ? latestTour.examinationDate.split('T')[0] : ''),
          visitedBefore: prev.visitedBefore || 'yes' // Auto-set to yes since we found tour data
        }));

        // Set indicator for tour data found
        setShowTourIndicator(true);

        // Hide indicator after 5 seconds
        setTimeout(() => {
          setShowTourIndicator(false);
        }, 5000);

        // Show success message in console
        console.log('✅ Pre-populated membership form with tour data:', {
          email: userEmail,
          educationalBackground: latestTour.educationalBackground,
          currentOccupation: latestTour.currentOccupation,
          jobTitle: latestTour.jobTitle,
          examPreparation: latestTour.examPreparation,
          examinationDate: latestTour.examinationDate
        });
        
      } else {
        console.log('No tour requests found for this email:', userEmail);
      }
      
    } catch (error) {
      console.error('Error fetching tour data:', error);
      // Don't show error to user, just log it
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.visitedBefore) {
      newErrors.visitedBefore = 'Please select an option';
    }
    
    if (!formData.fatherName.trim()) {
      newErrors.fatherName = 'Father\'s name is required';
    }
    
    if (!formData.parentContactNumber.trim()) {
      newErrors.parentContactNumber = 'Parent\'s contact number is required';
    }
    
    if (!formData.educationalBackground) {
      newErrors.educationalBackground = 'Educational background is required';
    }
    
    if (!formData.currentOccupation) {
      newErrors.currentOccupation = 'Current occupation is required';
    }
    
    if (!formData.currentAddress.trim()) {
      newErrors.currentAddress = 'Current address is required';
    }
    
    // Job title is only required if not unemployed or student
    if (!formData.jobTitle.trim() && formData.currentOccupation !== 'Unemployed' && formData.currentOccupation !== 'Student') {
      newErrors.jobTitle = 'Job title is required';
    }
    
    if (!formData.examPreparation) {
      newErrors.examPreparation = 'Please select an exam you are preparing for';
    }
    
    if (!formData.examinationDate) {
      newErrors.examinationDate = 'Examination date is required';
    } else {
      // Validate that the examination date is in the future (at least tomorrow)
      const selectedDate = new Date(formData.examinationDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (selectedDate < tomorrow) {
        newErrors.examinationDate = 'Please select a future examination date (tomorrow or later)';
      }
    }
    
    
    if (!formData.selfiePhoto) {
      newErrors.selfiePhoto = 'Please upload a selfie photo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Check if we have auth token, if not, skip API call for now
        const hasToken = localStorage.getItem('authToken');
        
        if (hasToken) {
          // Save membership details to database
          const response = await apiService.updateMembershipDetails(formData);
          
          if (response.success) {
            // Pass updated user data to next screen
            onContinue({
              ...userData,
              ...response.user,
              membershipDetails: formData
            });
          } else {
            setErrors({ submit: response.message || 'Failed to save membership details' });
          }
        } else {
          // For now, just continue without saving to DB (demo mode)
          onContinue({
            ...userData,
            membershipDetails: formData
          });
        }
      } catch (error) {
        setErrors({ submit: error.message || 'Failed to save membership details. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <motion.div 
      className="main-container membership-details-adjustment"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.button 
        onClick={onBack}
        className="back-button"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft size={20} color="white" />
      </motion.button>
      <motion.div 
        className="header-section"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="main-title">Membership Details</h1>
        <p className="main-subtitle">Fill in your details to complete registration</p>
      </motion.div>

      <motion.form 
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {/* Have you visited before */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <label className="membership-input-label">
            Have you visited Dnyanpeeth Abhyasika before and filled out our form?
          </label>
          <div className="marathi-text">
            तुम्ही यापूर्वी ज्ञानपीठ अभ्यासिकेला भेट देऊन फॉर्म भरला आहे का?
          </div>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="visitedBefore"
                value="yes"
                checked={formData.visitedBefore === 'yes'}
                onChange={handleInputChange}
              />
              <span className="radio-custom"></span>
              Yes
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="visitedBefore"
                value="no"
                checked={formData.visitedBefore === 'no'}
                onChange={handleInputChange}
              />
              <span className="radio-custom"></span>
              No
            </label>
          </div>
          
          {/* Tour Data Indicator */}
          <AnimatePresence>
            {showTourIndicator && (
              <motion.div 
                className="tour-data-indicator"
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                style={{
                  background: 'white',
                  color: '#065f46',
                  border: '2px solid #10b981',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '400',
                  fontStyle: 'italic',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'justify',
                  lineHeight: '1.5'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="9"/>
                </svg>
                Great! We found you visited Dyanpitt for a tour and pre-populated some fields from the Tour Details.
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errors.visitedBefore && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.visitedBefore}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Father's Name */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <label className="membership-input-label">
            What is your father's name?
          </label>
          <div className="marathi-text">
            वडिलांचे नाव येथे टाका.
          </div>
          <input
            type="text"
            name="fatherName"
            placeholder="Enter your father's name"
            value={formData.fatherName}
            onChange={handleInputChange}
            className={`form-input ${errors.fatherName ? 'input-error' : ''}`}
          />
          <AnimatePresence>
            {errors.fatherName && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.fatherName}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Parent's Contact Number */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <label className="membership-input-label">
            Parent's contact number?
          </label>
          <div className="marathi-text">
            तुमच्या पालकांचा मोबाईल नंबर येथे लिहा.
          </div>
          <input
            type="tel"
            name="parentContactNumber"
            placeholder="Enter parent's contact number"
            value={formData.parentContactNumber}
            onChange={handleInputChange}
            className={`form-input ${errors.parentContactNumber ? 'input-error' : ''}`}
          />
          <AnimatePresence>
            {errors.parentContactNumber && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.parentContactNumber}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Current Address */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <label className="membership-input-label">
            What is your current address?
          </label>
          <div className="marathi-text">
            तुम्ही सध्या राहत असलेला संपूर्ण पत्ता येथे लिहा.
          </div>
          <textarea
            name="currentAddress"
            placeholder="Enter your current address"
            value={formData.currentAddress}
            onChange={handleInputChange}
            className={`form-input ${errors.currentAddress ? 'input-error' : ''}`}
            rows="3"
          />
          <AnimatePresence>
            {errors.currentAddress && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.currentAddress}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Educational Background */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <label className="membership-input-label">
            What is your educational background?
          </label>
          <div className="marathi-text">
            तुमची शैक्षणिक पात्रता निवडा.
          </div>
          <CustomDropdown
            name="educationalBackground"
            value={formData.educationalBackground}
            onChange={handleInputChange}
            options={[
              { value: "High School", label: "High School" },
              { value: "Graduation", label: "Graduation" },
              { value: "Post Graduation", label: "Post Graduation" },
              { value: "Doctorate Degree", label: "Doctorate Degree" },
              { value: "Technical or Vocational School", label: "Technical or Vocational School" },
              { value: "Other", label: "Other" }
            ]}
            placeholder="Select your educational background"
            className="form-input"
            error={errors.educationalBackground}
          />
          <AnimatePresence>
            {errors.educationalBackground && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.educationalBackground}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Current Occupation */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <label className="membership-input-label">
            What is your current occupation?
          </label>
          <div className="marathi-text">
            तुमचा सध्याचा व्यवसाय निवडा.
          </div>
          <CustomDropdown
            name="currentOccupation"
            value={formData.currentOccupation}
            onChange={handleInputChange}
            options={[
              { value: "Student", label: "Student" },
              { value: "Employed", label: "Employed" },
              { value: "Self-employed", label: "Self-employed" },
              { value: "Unemployed", label: "Unemployed" },
              { value: "Retired", label: "Retired" },
              { value: "Other", label: "Other" }
            ]}
            placeholder="Select your current occupation"
            className="form-input"
            error={errors.currentOccupation}
          />
          <AnimatePresence>
            {errors.currentOccupation && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.currentOccupation}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Job Title */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <label className="membership-input-label">
            What is your job title?
            {(formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student') && 
              <span className="optional-text"> (Not applicable)</span>
            }
          </label>
          <div className="marathi-text">
            तुमचा हुद्दा येथे लिहा.
          </div>
          <input
            type="text"
            name="jobTitle"
            placeholder={
              formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student' 
                ? "Not applicable for your occupation" 
                : "Enter your job title"
            }
            value={formData.jobTitle}
            onChange={handleInputChange}
            disabled={formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student'}
            className={`form-input ${errors.jobTitle ? 'input-error' : ''} ${
              (formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student') ? 'disabled' : ''
            }`}
          />
          <AnimatePresence>
            {errors.jobTitle && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.jobTitle}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Exam Preparation */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <label className="membership-input-label">
            What specific exam are you preparing for by using the study room facilities?
          </label>
          <div className="marathi-text">
            कोणत्या परीक्षेच्या तयारीसाठी अभ्यासिकेचा वापर करणार आहात?
          </div>
          <CustomDropdown
            name="examPreparation"
            value={formData.examPreparation}
            onChange={handleInputChange}
            options={[
              { value: "MPSC", label: "MPSC" },
              { value: "UPSC", label: "UPSC" },
              { value: "Saral Seva", label: "Saral Seva" },
              { value: "Railway", label: "Railway" },
              { value: "Staff Selection Commission", label: "Staff Selection Commission" },
              { value: "NOR-CET", label: "NOR-CET" },
              { value: "Police Bharti", label: "Police Bharti" },
              { value: "SRPF", label: "SRPF" },
              { value: "CRPF", label: "CRPF" },
              { value: "Army-GD", label: "Army-GD" },
              { value: "Army-NA", label: "Army-NA" },
              { value: "SSC (10th)", label: "SSC (10th)" },
              { value: "HSC (12th)", label: "HSC (12th)" },
              { value: "JEE", label: "JEE" },
              { value: "NEET", label: "NEET" },
              { value: "MHT-CET", label: "MHT-CET" },
              { value: "UG", label: "UG" },
              { value: "PG", label: "PG" },
              { value: "PHD", label: "PHD" },
              { value: "MCR", label: "MCR" },
              { value: "CDS", label: "CDS" },
              { value: "DMER", label: "DMER" },
              { value: "Banking", label: "Banking" },
              { value: "Any Other", label: "Any Other" }
            ]}
            placeholder="Choose an option"
            className="form-input"
            error={errors.examPreparation}
          />
          <AnimatePresence>
            {errors.examPreparation && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.examPreparation}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Examination Date */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <label className="membership-input-label">
            What is the tentative date of your examination?
          </label>
          <div className="marathi-text">
            तुमच्या परीक्षेची अंदाजे तारीख येथे लिहा.
          </div>
          <DatePicker
            name="examinationDate"
            value={formData.examinationDate}
            onChange={handleInputChange}
            className={errors.examinationDate ? 'input-error' : ''}
            error={!!errors.examinationDate}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            placeholder="e.g., August 15, 2024"
          />
          <AnimatePresence>
            {errors.examinationDate && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.examinationDate}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>


        {/* Selfie Photo Upload */}
        <motion.div 
          className="input-group"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
        >
          <label className="membership-input-label">
            Please upload a selfie photo here. *
          </label>
          <div className="marathi-text">
            स्वतःचा फोटो येथे अपलोड करा.
          </div>
          <div className="file-upload-container">
            <input
              type="file"
              name="selfiePhoto"
              accept="image/*"
              capture="user"
              onChange={handleInputChange}
              className="file-input-hidden"
              id="selfiePhoto"
            />
            <label 
              htmlFor="selfiePhoto" 
              className={`file-upload-button ${errors.selfiePhoto ? 'input-error' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              {formData.selfiePhoto ? 'Change Photo' : 'Upload Selfie Photo'}
            </label>
            {formData.selfiePhoto && (
              <div className="file-preview">
                <span className="file-name">📷 {formData.selfiePhoto.name}</span>
              </div>
            )}
          </div>
          <AnimatePresence>
            {errors.selfiePhoto && (
              <motion.span 
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {errors.selfiePhoto}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Submit Error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div 
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {errors.submit}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Submit Button */}
        <motion.button 
          type="submit" 
          className="login-button" 
          disabled={isLoading}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}