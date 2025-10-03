import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import CustomDropdown from '../../components/CustomDropdown';
import DatePicker from '../../components/DatePicker';
import apiService from '../../services/api';
import { validateFile, FILE_ERROR_MESSAGES } from '../../utils/fileValidation';
import { useFormAutoSave } from '../../utils/formAutoSave';
import '../../styles/accordion.css';

export default function MembershipDetailsScreen() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    visitedBefore: user?.membership?.visitedBefore || '',
    fatherName: user?.membership?.fatherName || '',
    parentContactNumber: user?.membership?.parentContactNumber || '',
    educationalBackground: user?.membership?.educationalBackground || '',
    currentOccupation: user?.membership?.currentOccupation || '',
    jobTitle: user?.membership?.jobTitle || '',
    examPreparation: user?.membership?.examPreparation || '',
    examinationDate: user?.membership?.examinationDate || '',
    selfiePhoto: user?.membership?.selfiePhoto || null
  });

  // Auto-save functionality
  const autoSave = useFormAutoSave(
    `membership_${user?.email || 'unknown'}`, 
    formData, 
    {
      excludeFields: ['selfiePhoto'], // Don't auto-save file uploads
      saveInterval: 2000, // Save every 2 seconds
      onSave: (data) => console.log('💾 Auto-saved membership form'),
      onRestore: (data) => console.log('📱 Restored membership form data')
    }
  );

  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTourIndicator, setShowTourIndicator] = useState(false);
  const [tourDataChecked, setTourDataChecked] = useState(false);

  // Accordion state management
  const [openSections, setOpenSections] = useState({
    background: true,  // Start with first section open
    study: false,
    personal: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Auto-expand sections when they have errors OR when previous section is completed
  useEffect(() => {
    const hasBackgroundErrors = errors.visitedBefore || errors.educationalBackground || errors.currentOccupation || errors.jobTitle;
    const hasStudyErrors = errors.examPreparation || errors.examinationDate;
    const hasPersonalErrors = errors.fatherName || errors.parentContactNumber || errors.selfiePhoto;

    // Check section completion status
    const backgroundCompleted = isSectionCompleted('background');
    const studyCompleted = isSectionCompleted('study');

    // Auto-expand on errors - always show sections with errors
    if (hasBackgroundErrors) {
      setOpenSections(prev => ({ ...prev, background: true }));
    }
    if (hasStudyErrors) {
      setOpenSections(prev => ({ ...prev, study: true }));
    }
    if (hasPersonalErrors) {
      setOpenSections(prev => ({ ...prev, personal: true }));
    }

    // Auto-progression logic: Open next section when current is completed
    // Only auto-progress if user hasn't manually interacted with sections
    if (backgroundCompleted && !hasBackgroundErrors && !hasStudyErrors) {
      setOpenSections(prev => ({ 
        ...prev, 
        background: false, // Close completed background section
        study: true        // Open next section
      }));
    }

    if (studyCompleted && !hasStudyErrors && !hasPersonalErrors) {
      setOpenSections(prev => ({ 
        ...prev, 
        study: false,      // Close completed study section
        personal: true     // Open final section
      }));
    }
  }, [errors, formData])

  // Check if section is completed (has no errors and all required fields filled)
  const isSectionCompleted = (section) => {
    switch (section) {
      case 'background':
        // For background section, jobTitle is only required if not unemployed or student
        const isJobTitleValid = formData.currentOccupation === 'Unemployed' || 
                               formData.currentOccupation === 'Student' || 
                               (formData.jobTitle && formData.jobTitle.trim());
        
        return formData.visitedBefore && 
               formData.educationalBackground && 
               formData.currentOccupation &&
               isJobTitleValid &&
               !errors.visitedBefore && !errors.educationalBackground && !errors.currentOccupation && !errors.jobTitle;
      case 'personal':
        return formData.fatherName && formData.fatherName.trim() && 
               formData.parentContactNumber && formData.parentContactNumber.trim() && 
               formData.selfiePhoto &&
               !errors.fatherName && !errors.parentContactNumber && !errors.selfiePhoto;
      case 'study':
        return formData.examPreparation && 
               formData.examinationDate && 
               !errors.examPreparation && !errors.examinationDate;
      default:
        return false;
    }
  };

  // Auto-restore saved form data on component load
  useEffect(() => {
    if (user?.email && autoSave.hasSavedData()) {
      const savedData = autoSave.loadSavedData();
      if (savedData && Object.keys(savedData).length > 0) {
        // Check if there's actually meaningful data to restore
        const hasData = Object.values(savedData).some(value => 
          value && value !== '' && value !== null && value !== undefined
        );
        
        if (hasData) {
          setFormData(prevData => ({
            ...prevData,
            ...savedData
          }));
          setShowAutoSaveIndicator(true);
          
          // Hide the indicator after 4 seconds
          setTimeout(() => {
            setShowAutoSaveIndicator(false);
          }, 4000);
        }
      }
    }
  }, [user?.email]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (user?.email && Object.keys(formData).some(key => formData[key])) {
      autoSave.scheduleAutoSave();
    }
  }, [formData, user?.email]);

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
        await fetchAndPopulateTourData(user?.email);
      } catch (error) {
        console.error('Error auto-checking tour data:', error);
      }
    };

    checkForTourData();
  }, [tourDataChecked, user?.email]); // Include user?.email dependency

  const handleInputChange = async (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        // Validate file using standardized validation
        const validation = validateFile(file, 'SELFIE');
        
        if (!validation.isValid) {
          setErrors(prev => ({
            ...prev,
            [name]: validation.error
          }));
          // Clear the file input
          e.target.value = '';
          return;
        }
        
        // Clear any previous error
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: file
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
      if (name === 'visitedBefore' && value === 'yes' && user?.email) {
        await fetchAndPopulateTourData(user.email);
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
          } catch {
          }
        }
        
        // If still no email, try to get current user from API
        if (!userEmail) {
          try {
            const currentUserResponse = await apiService.getCurrentUser();
            if (currentUserResponse.success && currentUserResponse.user?.email) {
              userEmail = currentUserResponse.user.email;
            }
          } catch {
          }
        }
      }
      
      if (!userEmail) {
        return;
      }
      
      // Fetch tour requests for this email
      let result; 
      try { 
        result = await apiService.request(`/tour/requests/${encodeURIComponent(userEmail)}`); 
      } catch { 
        return; 
      }
      
      // apiService.request returned parsed JSON
      if (!result || !result.success) {
        return;
      }
      
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
        // Always try to save to database first
        const response = await apiService.updateMembershipDetails(formData);
        
        if (response.success) {
          // Clear auto-saved data since form was successfully submitted
          autoSave.clearSavedData();
          
          // Update user data and navigate to booking
          const updatedUser = { 
            ...response.user, 
            membershipCompleted: true
          };
          updateUser(updatedUser);
          console.log('✅ Membership details saved to database successfully');
          navigate('/booking');
        } else {
          // If database save fails, show error but don't proceed
          setErrors({ submit: response.message || 'Failed to save membership details to database' });
        }
      } catch (error) {
        console.error('❌ Failed to save membership details:', error);
        // If API call fails due to network/auth issues, show specific error
        if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
          setErrors({ submit: 'Network error. Please check your connection and try again.' });
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          setErrors({ submit: 'Session expired. Please log in again.' });
        } else {
          setErrors({ submit: error.message || 'Failed to save membership details. Please try again.' });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="main-container membership-details-adjustment">
      <button 
        onClick={() => navigate(-1)}
        className="back-button"
      >
        <ArrowLeft size={20} color="white" />
      </button>
      <div 
        className="header-section"
      >
        <h1 className="main-title">Membership Details</h1>
        <p className="main-subtitle">Fill in your details to complete registration</p>
        
      </div>

      <form 
        onSubmit={handleSubmit}
      >
        {/* Accordion Section 1: Background Information */}
        <div className="accordion-section">
          <div 
            className={`accordion-header ${isSectionCompleted('background') ? 'completed' : ''}`}
            onClick={() => toggleSection('background')}
          >
            <div className="accordion-title-wrapper">
              <h3 className="accordion-title">Background Information</h3>
              {isSectionCompleted('background') && (
                <div className="completion-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="accordion-chevron">
              {openSections.background ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          {openSections.background && (
            <div className="accordion-content">
        {/* Have you visited before */}
        <div 
          className="input-group"
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
          {showTourIndicator && (
              <div 
                className="tour-data-indicator membership-details-tour-indicator"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="9"/>
                </svg>
                Great! We found you visited Dyanpitt for a tour and pre-populated some fields from the Tour Details.
              </div>
            )}

          {errors.visitedBefore && (
            <span 
              className="error-message"
            >
              {errors.visitedBefore}
            </span>
          )}
        </div>

        {/* Educational Background */}
        <div 
          className="input-group"
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
          {errors.educationalBackground && (
              <span 
                className="error-message"
              >
                {errors.educationalBackground}
              </span>
            )}
        </div>

        {/* Current Occupation */}
        <div 
          className="input-group"
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
          {errors.currentOccupation && (
              <span 
                className="error-message"
              >
                {errors.currentOccupation}
              </span>
            )}
        </div>

        {/* Job Title */}
        <div 
          className="input-group"
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
          {errors.jobTitle && (
              <span 
                className="error-message"
              >
                {errors.jobTitle}
              </span>
            )}
        </div>
            </div>
          )}
        </div>

        {/* Accordion Section 2: Study Goals & Documentation */}
        <div className="accordion-section">
          <div 
            className={`accordion-header ${isSectionCompleted('study') ? 'completed' : ''}`}
            onClick={() => toggleSection('study')}
          >
            <div className="accordion-title-wrapper">
              <h3 className="accordion-title">Study Goals & Documentation</h3>
              {isSectionCompleted('study') && (
                <div className="completion-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="accordion-chevron">
              {openSections.study ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          {openSections.study && (
            <div className="accordion-content">

        {/* Exam Preparation */}
        <div 
          className="input-group"
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
          {errors.examPreparation && (
              <span 
                className="error-message"
              >
                {errors.examPreparation}
              </span>
            )}
        </div>

        {/* Examination Date */}
        <div 
          className="input-group"
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
          {errors.examinationDate && (
              <span 
                className="error-message"
              >
                {errors.examinationDate}
              </span>
            )}
        </div>
            </div>
          )}
        </div>

        {/* Accordion Section 3: Personal & Contact Details */}
        <div className="accordion-section">
          <div 
            className={`accordion-header ${isSectionCompleted('personal') ? 'completed' : ''}`}
            onClick={() => toggleSection('personal')}
          >
            <div className="accordion-title-wrapper">
              <h3 className="accordion-title">Personal & Contact Details</h3>
              {isSectionCompleted('personal') && (
                <div className="completion-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="accordion-chevron">
              {openSections.personal ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          
          {openSections.personal && (
            <div className="accordion-content">

        {/* Father's Name */}
        <div 
          className="input-group"
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
          {errors.fatherName && (
              <span 
                className="error-message"
              >
                {errors.fatherName}
              </span>
            )}
        </div>

        {/* Parent's Contact Number */}
        <div 
          className="input-group"
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
          {errors.parentContactNumber && (
              <span 
                className="error-message"
              >
                {errors.parentContactNumber}
              </span>
            )}
        </div>

        {/* Selfie Photo Upload */}
        <div 
          className="input-group"
        >
          <label className="membership-input-label">
            Please upload a selfie photo here. *
          </label>
          <div className="marathi-text">
            स्वतःचा फोटो येथे अपलोड करा. (फ्रंट कॅमेरा वापरा)
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
              {formData.selfiePhoto ? 'Change Selfie' : 'Take Selfie Photo'}
            </label>
            {formData.selfiePhoto && (
              <div className="file-preview">
                <span className="file-name">📷 {formData.selfiePhoto.name}</span>
              </div>
            )}
          </div>
          {errors.selfiePhoto && (
              <span 
                className="error-message"
              >
                {errors.selfiePhoto}
              </span>
            )}
        </div>
            </div>
          )}
        </div>

        
        {/* Submit Error */}
        {errors.submit && (
            <div 
              className="error-message"
            >
              {errors.submit}
            </div>
          )}
        
        {/* Submit Button */}
        <button 
          type="submit" 
          className="login-button" 
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}