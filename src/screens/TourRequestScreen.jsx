import React, { useState } from 'react';
import DatePicker from '../components/DatePicker';

export default function TourRequestScreen({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    groupSize: '1',
    interests: [],
    additionalRequests: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const interestOptions = [
    'Facilities Tour',
    'Membership Information',
    'Class Schedules',
    'Personal Training',
    'Group Programs',
    'Equipment Demo'
  ];

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
    '5:00 PM - 6:00 PM'
  ];

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

  const handleInterestChange = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
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
    
    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Preferred date is required';
    } else {
      // Validate that the date is in the future (at least tomorrow)
      const selectedDate = new Date(formData.preferredDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (selectedDate < tomorrow) {
        newErrors.preferredDate = 'Please select a future date (tomorrow or later)';
      }
    }
    
    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Preferred time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  // Get tomorrow's date as minimum selectable date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="main-container membership-details-adjustment">
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
          <label className="input-label membership-input-label">
            Full Name *
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>पूर्ण नाव</div>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className={`form-input ${errors.fullName ? 'input-error' : ''}`}
            placeholder="Enter your full name / आपले पूर्ण नाव टाका"
            disabled={isLoading}
          />
          {errors.fullName && <div className="error-message">{errors.fullName}</div>}
        </div>

        {/* Email */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Email Address *
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>ईमेल पत्ता</div>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            placeholder="Enter your email address / आपला ईमेल पत्ता टाका"
            disabled={isLoading}
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
        </div>

        {/* Phone */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Phone Number *
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>फोन नंबर</div>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={`form-input ${errors.phone ? 'input-error' : ''}`}
            placeholder="Enter your phone number / आपला फोन नंबर टाका"
            disabled={isLoading}
          />
          {errors.phone && <div className="error-message">{errors.phone}</div>}
        </div>

        {/* Preferred Date */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Preferred Date *
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>प्राधान्य दिनांक</div>
          </label>
          <DatePicker
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleInputChange}
            className={errors.preferredDate ? 'input-error' : ''}
            error={!!errors.preferredDate}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            placeholder="e.g., July 15, 2024"
          />
          {errors.preferredDate && <div className="error-message">{errors.preferredDate}</div>}
        </div>

        {/* Preferred Time */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Preferred Time *
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>प्राधान्य वेळ</div>
          </label>
          <select
            name="preferredTime"
            value={formData.preferredTime}
            onChange={handleInputChange}
            className={`form-input ${errors.preferredTime ? 'input-error' : ''}`}
            disabled={isLoading}
          >
            <option value="">Select a time slot / वेळ निवडा</option>
            {timeSlots.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
          {errors.preferredTime && <div className="error-message">{errors.preferredTime}</div>}
        </div>

        {/* Group Size */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Group Size
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>गटाचा आकार</div>
          </label>
          <select
            name="groupSize"
            value={formData.groupSize}
            onChange={handleInputChange}
            className="form-input"
            disabled={isLoading}
          >
            <option value="1">Just me / फक्त मी</option>
            <option value="2">2 people / 2 लोक</option>
            <option value="3">3 people / 3 लोक</option>
            <option value="4">4 people / 4 लोक</option>
            <option value="5+">5+ people / 5+ लोक</option>
          </select>
        </div>

        {/* Areas of Interest */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Areas of Interest
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>स्वारस्याची क्षेत्रे</div>
          </label>
          <div className="services-grid">
            {interestOptions.map(interest => (
              <label key={interest} className="service-checkbox">
                <input
                  type="checkbox"
                  checked={formData.interests.includes(interest)}
                  onChange={() => handleInterestChange(interest)}
                  disabled={isLoading}
                />
                <span className="checkmark"></span>
                <span className="service-label">{interest}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Requests */}
        <div className="input-group">
          <label className="input-label membership-input-label">
            Additional Requests or Questions
            <div style={{ color: '#666', fontSize: '12px', fontWeight: '400' }}>अतिरिक्त विनंत्या किंवा प्रश्न</div>
          </label>
          <textarea
            name="additionalRequests"
            value={formData.additionalRequests}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Any specific areas you'd like to see or questions you have... / आपल्याला पाहायची असलेली विशिष्ट क्षेत्रे किंवा प्रश्न..."
            rows="4"
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'Submitting Request...' : 'Submit Tour Request'}
        </button>
      </form>
    </div>
  );
}