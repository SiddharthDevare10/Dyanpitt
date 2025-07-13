import React, { useState } from 'react';
import DatePicker from '../components/DatePicker';
import CustomDropdown from '../components/CustomDropdown';

export default function TourRequestScreen({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    tourDate: '',
    tourTime: '',
    educationalBackground: '',
    currentOccupation: '',
    jobTitle: '',
    examPreparation: '',
    examinationDate: '',
    studyRoomDuration: '',
    howDidYouKnow: '',
    previousStudyRoomExperience: '',
    studyRoomComparison: '',
    startDate: '',
    preferredDate: '',
    preferredTime: '',
    groupSize: '1',
    interests: [],
    additionalRequests: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };


  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.tourDate) {
      newErrors.tourDate = 'Tour date is required';
    } else {
      // Validate that the date is in the future (at least tomorrow)
      const selectedDate = new Date(formData.tourDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (selectedDate < tomorrow) {
        newErrors.tourDate = 'Please select a future date (tomorrow or later)';
      }
    }
    
    if (!formData.tourTime) {
      newErrors.tourTime = 'Tour time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Show the self-declaration modal instead of submitting directly
    setShowModal(true);
    console.log('Modal should open now, showModal:', true);
  };

  const handleFinalSubmit = async () => {
    if (!isAgreed) {
      alert('Please agree to the terms and conditions to proceed.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Tour request submitted:', formData);
      
      if (onSubmit) {
        onSubmit(formData);
      }
    } catch (error) {
      console.error('Error submitting tour request:', error);
    } finally {
      setIsLoading(false);
      setShowModal(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };


  return (
    <div className="main-container tour-request-container">
      <button onClick={handleBack} className="back-button" disabled={isLoading}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="header-section">
        <h1 className="main-title">Request a Tour</h1>
        <p className="main-subtitle">Schedule your personalized facility tour</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Full Name */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            What is your full name?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>आपले पूर्ण नाव येथे टाका</div>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className={`form-input ${errors.fullName ? 'input-error' : ''}`}
            placeholder="Enter your full name"
            disabled={isLoading}
          />
          {errors.fullName && <div className="error-message">{errors.fullName}</div>}
        </div>

        {/* Email */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Enter your email address
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>आपला ईमेल पत्ता येथे टाका</div>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            placeholder="Enter your email address"
            disabled={isLoading}
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>

        {/* Phone */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Enter your Phone Number
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>आपला फोन नंबर टाका</div>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={`form-input ${errors.phone ? 'input-error' : ''}`}
            placeholder="Enter your phone number"
            disabled={isLoading}
          />
          {errors.phone && <div className="error-message">{errors.phone}</div>}
        </div>

        {/* Gender */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Please select your Gender
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>कृपया आपले लिंग निवडा</div>
          </label>
          <CustomDropdown
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
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
          {errors.gender && <div className="error-message">{errors.gender}</div>}
        </div>

        {/* Tour Date */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Preferred Tour Date
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>टूरची प्राधान्य तारीख</div>
          </label>
          <DatePicker
            name="tourDate"
            value={formData.tourDate}
            onChange={handleInputChange}
            className={errors.tourDate ? 'input-error' : ''}
            error={!!errors.tourDate}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            placeholder="e.g., January 15, 2025"
          />
          {errors.tourDate && <div className="error-message">{errors.tourDate}</div>}
        </div>

        {/* Tour Time */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Preferred Tour Time
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>टूरची प्राधान्य वेळ</div>
          </label>
          <CustomDropdown
            name="tourTime"
            value={formData.tourTime}
            onChange={handleInputChange}
            options={[
              { value: "9:00 AM - 10:00 AM", label: "9:00 AM - 10:00 AM" },
              { value: "10:00 AM - 11:00 AM", label: "10:00 AM - 11:00 AM" },
              { value: "11:00 AM - 12:00 PM", label: "11:00 AM - 12:00 PM" },
              { value: "12:00 PM - 1:00 PM", label: "12:00 PM - 1:00 PM" },
              { value: "1:00 PM - 2:00 PM", label: "1:00 PM - 2:00 PM" },
              { value: "2:00 PM - 3:00 PM", label: "2:00 PM - 3:00 PM" },
              { value: "3:00 PM - 4:00 PM", label: "3:00 PM - 4:00 PM" },
              { value: "4:00 PM - 5:00 PM", label: "4:00 PM - 5:00 PM" },
              { value: "5:00 PM - 6:00 PM", label: "5:00 PM - 6:00 PM" },
              { value: "6:00 PM - 7:00 PM", label: "6:00 PM - 7:00 PM" },
              { value: "7:00 PM - 8:00 PM", label: "7:00 PM - 8:00 PM" },
              { value: "8:00 PM - 9:00 PM", label: "8:00 PM - 9:00 PM" }
            ]}
            placeholder="Select preferred time slot"
            className="form-input"
            error={errors.tourTime}
            disabled={isLoading}
          />
          {errors.tourTime && <div className="error-message">{errors.tourTime}</div>}
        </div>

        {/* Educational Background */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            What is your educational background?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>तुमची शैक्षणिक पात्रता निवडा</div>
          </label>
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
            disabled={isLoading}
          />
          {errors.educationalBackground && <div className="error-message">{errors.educationalBackground}</div>}
        </div>

        {/* Current Occupation */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            What is your current occupation?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>तुमचा सध्याचा व्यवसाय निवडा</div>
          </label>
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
            disabled={isLoading}
          />
          {errors.currentOccupation && <div className="error-message">{errors.currentOccupation}</div>}
        </div>

        {/* Job Title */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            What is your job title?
            {(formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student') && 
              <span className="optional-text"> (Not applicable)</span>
            }
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>तुमचा हुद्दा येथे लिहा</div>
          </label>
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
            disabled={formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student' || isLoading}
            className={`form-input ${errors.jobTitle ? 'input-error' : ''} ${
              (formData.currentOccupation === 'Unemployed' || formData.currentOccupation === 'Student') ? 'disabled' : ''
            }`}
          />
          {errors.jobTitle && <div className="error-message">{errors.jobTitle}</div>}
        </div>

        {/* Exam Preparation */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            What specific exam are you preparing for by using the study room facilities?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>कोणत्या परीक्षेच्या तयारीसाठी अभ्यासिकेचा वापर करणार आहात?</div>
          </label>
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
            disabled={isLoading}
          />
          {errors.examPreparation && <div className="error-message">{errors.examPreparation}</div>}
        </div>

        {/* Tentative Examination Date */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            What is the tentative date of your examination?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>तुमच्या परीक्षेची अंदाजे तारीख येथे लिहा</div>
          </label>
          <DatePicker
            name="examinationDate"
            value={formData.examinationDate}
            onChange={handleInputChange}
            className={errors.examinationDate ? 'input-error' : ''}
            error={!!errors.examinationDate}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            placeholder="e.g., August 15, 2024"
          />
          {errors.examinationDate && <div className="error-message">{errors.examinationDate}</div>}
        </div>

        {/* Study Room Duration */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            How long do you intend to use the study room? Is it a short-term or long-term commitment?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>किती महिन्यांसाठी अभ्यासिकेला यायचे आहे?</div>
          </label>
          <CustomDropdown
            name="studyRoomDuration"
            value={formData.studyRoomDuration}
            onChange={handleInputChange}
            options={[
              { value: "Less than a month", label: "Less than a month" },
              { value: "1 Month", label: "1 Month" },
              { value: "2 Month", label: "2 Month" },
              { value: "3 Month", label: "3 Month" },
              { value: "4 Month", label: "4 Month" },
              { value: "5 Month", label: "5 Month" },
              { value: "6 Month", label: "6 Month" },
              { value: "More Than 6 Months", label: "More Than 6 Months" },
              { value: "1 Year", label: "1 Year" },
              { value: "More Than 1 Year", label: "More Than 1 Year" }
            ]}
            placeholder="Select duration"
            className="form-input"
            error={errors.studyRoomDuration}
            disabled={isLoading}
          />
          {errors.studyRoomDuration && <div className="error-message">{errors.studyRoomDuration}</div>}
        </div>

        {/* How did you know about us */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            How did you come to know about Dnyanpeeth Abhyasika? *
            <div style={{ color: '#000000', fontSize: '14px', fontWeight: '400' }}>ज्ञानपीठ अभ्यासिकेबाबत आपणास माहिती कशी मिळाली?</div>
          </label>
          <CustomDropdown
            name="howDidYouKnow"
            value={formData.howDidYouKnow}
            onChange={handleInputChange}
            options={[
              { value: "Friends", label: "Friends" },
              { value: "Google", label: "Google" },
              { value: "Facebook", label: "Facebook" },
              { value: "Instagram", label: "Instagram" },
              { value: "Vivek Sindhu", label: "Vivek Sindhu" },
              { value: "WhatsApp", label: "WhatsApp" },
              { value: "SMS", label: "SMS" },
              { value: "Pamphlet", label: "Pamphlet" },
              { value: "Banner / Hoarding", label: "Banner / Hoarding" }
            ]}
            placeholder="Select from options"
            className="form-input"
            error={errors.howDidYouKnow}
            disabled={isLoading}
          />
          {errors.howDidYouKnow && <div className="error-message">{errors.howDidYouKnow}</div>}
        </div>

        {/* Previous Study Room Experience */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Have you ever studied at a study room before? If yes, please mention the name and location of the study room.
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>तुम्ही यापूर्वी कधी स्टडी रूममध्येे अभ्यास केला आहे का? जर होय, तर कृपया स्टडी रूमचे नाव आणि ठिकाण नमूद करा.</div>
          </label>
          <input
            type="text"
            name="previousStudyRoomExperience"
            placeholder="Enter study room name and location"
            value={formData.previousStudyRoomExperience}
            onChange={handleInputChange}
            className={`form-input ${errors.previousStudyRoomExperience ? 'input-error' : ''}`}
            disabled={isLoading}
          />
          {errors.previousStudyRoomExperience && <div className="error-message">{errors.previousStudyRoomExperience}</div>}
        </div>

        {/* Study Room Comparison */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            Did you compare study room options before choosing this one? If yes, what were the deciding factors?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>ज्ञानपीठ अभ्यासिका निवडण्यापूर्वी इतर स्टडी रूम सोबत तुलना केली आहे का? होय असल्यास, ज्ञानपीठ अभ्यासिका निवडण्याचे मुख्य कारण?</div>
          </label>
          <input
            type="text"
            name="studyRoomComparison"
            placeholder="Enter your comparison details and deciding factors (or write 'No' if you didn't compare)"
            value={formData.studyRoomComparison}
            onChange={handleInputChange}
            className={`form-input ${errors.studyRoomComparison ? 'input-error' : ''}`}
            disabled={isLoading}
          />
          {errors.studyRoomComparison && <div className="error-message">{errors.studyRoomComparison}</div>}
        </div>

        {/* Start Date for Study Room */}
        <div className="input-group">
          <label className="input-label tour-input-label">
            When do you plan to start using the study room facilities?
            <div style={{ color: '#000000', fontSize: '13px', fontWeight: '400' }}>किती तारखेपासून अभ्यासिकेला यायचे आहे?</div>
          </label>
          <DatePicker
            name="startDate"
            value={formData.startDate}
            onChange={handleInputChange}
            className={errors.startDate ? 'input-error' : ''}
            error={!!errors.startDate}
            min={new Date().toISOString().split('T')[0]}
            placeholder="e.g., February 1, 2025"
          />
          {errors.startDate && <div className="error-message">{errors.startDate}</div>}
        </div>

        <button type="submit" className="login-button" disabled={isLoading} style={{ marginTop: '40px' }}>
          {isLoading ? 'Submitting Request...' : 'Submit Tour Request'}
        </button>
      </form>

      {/* Self-Declaration Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>Self-Declaration</h2>
              <button 
                className="login-button modal-close"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 12px',
                  fontSize: '16px',
                  minWidth: 'auto',
                  width: 'auto'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="declaration-content">
                <div className="declaration-points">
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6', fontSize: '12px' }}>
                    <li style={{ marginBottom: '15px' }}>I declare that all information provided in this form is true and correct to the best of my knowledge. Any false or misleading information provided may result in the rejection of my application.</li>
                    
                    <li style={{ marginBottom: '15px' }}>I am committed to maintaining a peaceful environment and will adhere to all the rules and regulations set forth by Dnyanpeeth Abhyasika. I will respect the rights of my fellow students and ensure that my behavior and conduct do not disrupt the learning process.</li>
                    
                    <li style={{ marginBottom: '15px' }}>I will use facilities responsibly and comply with Dnyanpeeth Abhyasika's regulations, avoiding disruptive or illegal activities.</li>
                    
                    <li style={{ marginBottom: '15px' }}>I declare that I won't consume tobacco or gutkha in Dnyanpeeth Abhyasika campus. Spitting after consuming such substances is prohibited, and I will maintain a clean and healthy environment for all.</li>
                    
                    <li style={{ marginBottom: '15px' }}>I will take full responsibility for the personal belongings that I bring into Dnyanpeeth Abhyasika and will not hold Dnyanpeeth Abhyasika responsible for any loss or damage to my property.</li>
                    
                    <li style={{ marginBottom: '15px' }}>I agree to pay the necessary fees for membership at Dnyanpeeth Abhyasika, including the Non-Refundable Deposit of Rs. 699/-, which will be valid for one year from the date of my membership.</li>
                    
                    <li style={{ marginBottom: '15px' }}>By submitting this form, I acknowledge that I have read, understood, and agreed to the terms and conditions set by the Dnyanpeeth Abhyasika.</li>
                  </ul>
                </div>
                
                <div className="agreement-section" style={{ marginTop: '30px' }}>
                  <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <input
                      type="checkbox"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                    />
                    <span className="checkbox-text" style={{ fontWeight: 'bold' }}>I Agree</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{
              padding: '20px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button 
                className="login-button"
                onClick={handleFinalSubmit}
                disabled={!isAgreed || isLoading}
                style={{ width: '50%' }}
              >
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}