import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';
import SeatSelectionModal from '../components/SeatSelectionModal';
import DatePicker from '../components/DatePicker';
import apiService from '../services/api';
import { getPrice } from '../data/pricing';
import { calculateTotalDiscount, qualifiesForFemaleDiscount, calculateTotalPriceWithFees, shouldApplyRegistrationFee, REGISTRATION_FEE } from '../data/discounts';

export default function BookingScreen({ userData, onBack, onContinue }) {
  const [formData, setFormData] = useState({
    timeSlot: userData?.bookingDetails?.timeSlot || '',
    membershipType: userData?.bookingDetails?.membershipType || '',
    membershipDuration: userData?.bookingDetails?.membershipDuration || '',
    membershipStartDate: userData?.bookingDetails?.membershipStartDate || '',
    preferredSeat: userData?.bookingDetails?.preferredSeat || ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If membership type changes, reset dependent fields
    if (name === 'membershipType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        timeSlot: '', // Reset time slot when membership changes
        membershipDuration: '', // Reset duration when membership changes
        preferredSeat: '' // Reset seat selection when membership changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user makes a selection
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.timeSlot) {
      newErrors.timeSlot = 'Please select a time slot';
    }
    
    if (!formData.membershipType) {
      newErrors.membershipType = 'Please select a membership type';
    }
    
    if (!formData.membershipDuration) {
      newErrors.membershipDuration = 'Please select membership duration';
    }
    
    if (!formData.membershipStartDate) {
      newErrors.membershipStartDate = 'Please select membership start date';
    } else {
      // Validate start date is within 30 days (compare dates only, not times)
      const startDate = new Date(formData.membershipStartDate);
      startDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thirtyDaysFromToday = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      if (startDate < today) {
        newErrors.membershipStartDate = 'Start date cannot be in the past';
      } else if (startDate > thirtyDaysFromToday) {
        newErrors.membershipStartDate = 'Start date must be within 30 days from today';
      }
    }
    
    if (!formData.preferredSeat) {
      newErrors.preferredSeat = 'Please select a preferred seat';
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
          // Save booking details to database with calculated total amount and fee breakdown
          const isFemale = userData?.gender === 'female';
          const userRegistrationDate = userData?.registrationDate;
          const lastPackageDate = userData?.lastPackageDate;
          const seatTier = getSeatTier(formData.preferredSeat);
          
          // Calculate detailed fee breakdown
          const basePrice = formData.membershipType === 'Calista Garden' 
            ? 399 * (formData.membershipDuration.split(' ')[0] === '1' ? 1 : parseInt(formData.membershipDuration.split(' ')[0]))
            : getPrice(formData.membershipDuration, formData.membershipType, formData.timeSlot);
          
          const seatTierSurcharge = applySeatTierPricing(basePrice, seatTier) - basePrice;
          const priceWithSeat = basePrice + seatTierSurcharge;
          
          const totalDiscount = formData.membershipType === 'Calista Garden'
            ? (isFemale && qualifiesForFemaleDiscount(formData.membershipDuration) ? 10 : 0)
            : calculateTotalDiscount(formData.membershipDuration, formData.membershipType, formData.timeSlot, isFemale);
          
          const totalDiscountAmount = Math.round(priceWithSeat * totalDiscount / 100);
          const registrationFee = shouldApplyRegistrationFee(userRegistrationDate, lastPackageDate) ? REGISTRATION_FEE : 0;
          const finalAmount = priceWithSeat - totalDiscountAmount + registrationFee;
          
          const feeBreakdown = {
            basePrice,
            seatTier,
            seatTierSurcharge,
            discounts: {
              femaleDiscount: isFemale && (formData.membershipType === 'Calista Garden' || qualifiesForFemaleDiscount(formData.membershipDuration)) ? (formData.membershipType === 'Calista Garden' ? 10 : 5) : 0,
              durationDiscount: totalDiscount - (isFemale && (formData.membershipType === 'Calista Garden' || qualifiesForFemaleDiscount(formData.membershipDuration)) ? (formData.membershipType === 'Calista Garden' ? 10 : 5) : 0),
              totalDiscountPercentage: totalDiscount,
              totalDiscountAmount
            },
            registrationFee,
            finalAmount
          };
          
          const bookingData = {
            ...formData,
            totalAmount: calculateTotalPrice(),
            feeBreakdown
          };
          const response = await apiService.updateBookingDetails(bookingData);
          
          if (response.success) {
            // Pass updated user data and payment amount to payment screen
            onContinue({
              ...userData,
              ...response.user,
              bookingDetails: formData,
              paymentAmount: response.paymentAmount
            });
          } else {
            setErrors({ submit: response.message || 'Failed to save booking details' });
          }
        } else {
          // For now, just continue without saving to DB (demo mode)
          onContinue({
            ...userData,
            bookingDetails: formData,
            paymentAmount: calculateTotalPrice()
          });
        }
      } catch {
        setErrors({ submit: 'Failed to save booking details. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Time slots based on membership type
  const getTimeSlots = () => {
    if (formData.membershipType === 'Calista Garden') {
      return [
        { 
          value: 'Calista Garden (7:00 AM - 7:00 PM)', 
          label: 'Calista Garden (7:00 AM - 7:00 PM) - 12 Hours' 
        }
      ];
    }
    
    return [
      { 
        value: 'Night Batch (10:00 PM - 7:00 AM)', 
        label: 'Night Batch (10:00 PM - 7:00 AM) - 9 Hours' 
      },
      { 
        value: 'Day Batch (7:00 AM - 10:00 PM)', 
        label: 'Day Batch (7:00 AM - 10:00 PM) - 15 Hours' 
      },
      { 
        value: '24 Hours Batch', 
        label: '24 Hours Batch - Full Day Access' 
      }
    ];
  };

  // Membership types based on CSV data - filter out male-only options for female users
  const getAllMembershipTypes = () => [
    { 
      value: 'Dyandhara Kaksh', 
      label: 'Dyandhara Kaksh (ज्ञानधारा कक्ष) ★',
      stars: '★',
      tier: 'Basic',
      features: ['Study room access', 'Basic seating', 'WiFi access', 'Reading materials', 'Affordable pricing'],
      maleOnly: true
    },
    { 
      value: 'Dyanpurn Kaksh', 
      label: 'Dyanpurn Kaksh (ज्ञानपूर्ण कक्ष) ★★',
      stars: '★★',
      tier: 'Premium',
      features: ['Priority seating', 'AC rooms', 'Locker facility', 'Extended hours', 'Study materials', 'Premium amenities']
    },
    { 
      value: 'Calista Garden', 
      label: 'Calista Garden (कॅलिस्ट गार्डन) ★★★',
      stars: '★★★',
      tier: 'Garden',
      features: ['Garden view seating', 'Peaceful environment', 'Natural lighting', 'Premium ambiance', 'Exclusive access'],
      isSpecial: true,
      specialPrice: 399,
      specialTimeSlot: 'Calista Garden (7:00 AM - 7:00 PM)'
    }
  ];

  const membershipTypes = getAllMembershipTypes().filter(membership => {
    // Filter out male-only memberships for female users
    if (userData?.gender === 'female' && membership.maleOnly) {
      return false;
    }
    return true;
  });

  // Membership durations based on membership type
  const getMembershipDurations = () => {
    if (formData.membershipType === 'Calista Garden') {
      // Only monthly options for Calista Garden
      return [
        { value: '1 Month', label: '1 Month' },
        { value: '2 Months', label: '2 Months' },
        { value: '3 Months', label: '3 Months' },
        { value: '4 Months', label: '4 Months' },
        { value: '5 Months', label: '5 Months' },
        { value: '6 Months', label: '6 Months' },
        { value: '7 Months', label: '7 Months' },
        { value: '8 Months', label: '8 Months' },
        { value: '9 Months', label: '9 Months' },
        { value: '10 Months', label: '10 Months' },
        { value: '11 Months', label: '11 Months' },
        { value: '12 Months', label: '12 Months' }
      ];
    }
    
    // All options for regular memberships
    return [
      // Daily options
      { value: '1 Day', label: '1 Day' },
      { value: '8 Days', label: '8 Days' },
      { value: '15 Days', label: '15 Days' },
      
      // Monthly options
      { value: '1 Month', label: '1 Month' },
      { value: '2 Months', label: '2 Months' },
      { value: '3 Months', label: '3 Months' },
      { value: '4 Months', label: '4 Months' },
      { value: '5 Months', label: '5 Months' },
      { value: '6 Months', label: '6 Months' },
      { value: '7 Months', label: '7 Months' },
      { value: '8 Months', label: '8 Months' },
      { value: '9 Months', label: '9 Months' },
      { value: '10 Months', label: '10 Months' },
      { value: '11 Months', label: '11 Months' },
      { value: '12 Months', label: '12 Months' }
    ];
  };

  // Handle seat selection from ASCII layout
  const handleSeatSelect = (seatId) => {
    setFormData(prev => ({
      ...prev,
      preferredSeat: seatId
    }));
    
    // Clear any seat selection error
    if (errors.preferredSeat) {
      setErrors(prev => ({
        ...prev,
        preferredSeat: ''
      }));
    }
  };

  // Helper function to get seat tier from selected seat
  const getSeatTier = (seatId) => {
    if (!seatId) return 'standard';
    
    // Extract seat number from seatId (e.g., "A5" -> 5, "B63" -> 63)
    const seatNum = parseInt(seatId.match(/\d+$/)?.[0] || '0');
    const sectionLetter = seatId.charAt(0);
    
    if (formData.membershipType === 'Dyandhara Kaksh') {
      if (seatNum === 5) return 'gold';
      if ([24, 25, 26, 27, 28, 29, 32, 33].includes(seatNum)) return 'silver';
      return 'standard';
    } else if (formData.membershipType === 'Calista Garden') {
      if (seatNum === 5) return 'gold';
      if ([24, 25, 26, 27, 28, 29, 32, 33].includes(seatNum)) return 'silver';
      return 'standard';
    } else if (formData.membershipType === 'Dyanpurn Kaksh') {
      // Section A: seats 54, 55, 56 are silver
      if (sectionLetter === 'A' && [54, 55, 56].includes(seatNum)) return 'silver';
      // Section B: seats 63, 64, 65 are silver
      if (sectionLetter === 'B' && [63, 64, 65].includes(seatNum)) return 'silver';
      // Section C: seat 69 is gold
      if (sectionLetter === 'C' && seatNum === 69) return 'gold';
      return 'standard';
    }
    return 'standard';
  };

  // Helper function to apply seat tier pricing
  const applySeatTierPricing = (basePrice, seatTier) => {
    switch (seatTier) {
      case 'silver':
        return Math.round(basePrice * 1.25); // 25% more
      case 'gold':
        return Math.round(basePrice * 1.50); // 50% more
      default:
        return basePrice; // standard tier - no change
    }
  };

  // Calculate total price using CSV data or special pricing
  const calculateTotalPrice = () => {
    if (!formData.membershipType || !formData.membershipDuration || !formData.timeSlot) return 0;
    
    const isFemale = userData?.gender === 'female';
    const userRegistrationDate = userData?.registrationDate;
    const lastPackageDate = userData?.lastPackageDate;
    const seatTier = getSeatTier(formData.preferredSeat);
    
    // Special pricing for Calista Garden
    if (formData.membershipType === 'Calista Garden') {
      const monthsMap = {
        '1 Month': 1, '2 Months': 2, '3 Months': 3, '4 Months': 4,
        '5 Months': 5, '6 Months': 6, '7 Months': 7, '8 Months': 8,
        '9 Months': 9, '10 Months': 10, '11 Months': 11, '12 Months': 12
      };
      const months = monthsMap[formData.membershipDuration] || 1;
      let originalPrice = 399 * months;
      
      // Apply seat tier pricing
      originalPrice = applySeatTierPricing(originalPrice, seatTier);
      
      // Apply female discount for Calista Garden if applicable
      let finalPrice = originalPrice;
      if (isFemale && qualifiesForFemaleDiscount(formData.membershipDuration)) {
        finalPrice = Math.round(originalPrice * 0.9); // 10% female discount
      }
      
      // Add registration fee if applicable
      const registrationFee = shouldApplyRegistrationFee(userRegistrationDate, lastPackageDate) ? REGISTRATION_FEE : 0;
      return finalPrice + registrationFee;
    }
    
    let originalPrice = getPrice(formData.membershipDuration, formData.membershipType, formData.timeSlot);
    
    // Apply seat tier pricing
    originalPrice = applySeatTierPricing(originalPrice, seatTier);
    
    return calculateTotalPriceWithFees(originalPrice, formData.membershipDuration, formData.membershipType, formData.timeSlot, isFemale, userRegistrationDate, lastPackageDate);
  };

  return ( /*  */
    <div className="main-container membership-details-adjustment">
      <button 
        onClick={onBack}
        className="back-button"
      >
        <ArrowLeft size={20} color="white" />
      </button>
      <div className="header-section">
        <h1 className="main-title">Book Your Seat</h1>
        <p className="main-subtitle">Choose your preferred time, membership plan, and duration</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Membership Type */}
        <div className="input-group">
          <label className="membership-input-label">
            Membership Type *
          </label>
          <CustomDropdown
            name="membershipType"
            value={formData.membershipType}
            onChange={handleInputChange}
            options={membershipTypes}
            placeholder="Choose membership type"
            className="form-input"
            error={errors.membershipType}
          />
          {errors.membershipType && <span className="error-message">{errors.membershipType}</span>}
          
          {/* Show features and pricing for selected membership */}
          {formData.membershipType && (
            <div className="membership-features">
              <div className="membership-tier">
                <span className="tier-stars">{membershipTypes.find(m => m.value === formData.membershipType)?.stars}</span>
                <span className="tier-name">{membershipTypes.find(m => m.value === formData.membershipType)?.tier} Tier</span>
              </div>
              <h4>Included Features:</h4>
              <ul>
                {membershipTypes.find(m => m.value === formData.membershipType)?.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              
            </div>
          )}
        </div>

        {/* Time Slot Selection */}
        <div className="input-group">
          <label className="membership-input-label">
            Select Time Slot *
          </label>
          <CustomDropdown
            name="timeSlot"
            value={formData.timeSlot}
            onChange={handleInputChange}
            options={getTimeSlots()}
            placeholder="Choose a time slot"
            className="form-input"
            error={errors.timeSlot}
          />
          {errors.timeSlot && <span className="error-message">{errors.timeSlot}</span>}
        </div>

        {/* Membership Duration */}
        <div className="input-group">
          <label className="membership-input-label">
            Membership Duration *
          </label>
          <CustomDropdown
            name="membershipDuration"
            value={formData.membershipDuration}
            onChange={handleInputChange}
            options={getMembershipDurations()}
            placeholder={formData.membershipType === 'Calista Garden' ? 'Choose monthly duration' : 'Choose duration'}
            className="form-input"
            error={errors.membershipDuration}
          />
          {errors.membershipDuration && <span className="error-message">{errors.membershipDuration}</span>}
          {formData.membershipType === 'Calista Garden' && (
            <div className="calista-note">
              <p>* Calista Garden membership is available in monthly durations only</p>
            </div>
          )}
        </div>

        {/* Membership Start Date */}
        <div className="input-group">
          <label className="membership-input-label">
            Membership Start Date *
          </label>
          <div className="marathi-text">
            Membership must start within 30 days from today
          </div>
          <DatePicker
            name="membershipStartDate"
            value={formData.membershipStartDate}
            onChange={handleInputChange}
            className={errors.membershipStartDate ? 'input-error' : ''}
            error={!!errors.membershipStartDate}
            min={new Date().toISOString().split('T')[0]}
            max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            placeholder="e.g., July 20, 2024"
          />
          {errors.membershipStartDate && <span className="error-message">{errors.membershipStartDate}</span>}
        </div>

        {/* Preferred Seat */}
        <div className="input-group">
          <label className="membership-input-label">
            Preferred Seat *
          </label>
          <button
            type="button"
            className={`form-input seat-selection-button ${errors.preferredSeat ? 'input-error' : ''}`}
            onClick={() => {
              if (formData.membershipType) {
                setShowSeatModal(true);
              }
            }}
            disabled={!formData.membershipType}
          >
            {formData.preferredSeat ? `Seat ${formData.preferredSeat}` : 
             formData.membershipType ? 'Choose your preferred seat' : 'Select membership type first'}
            <span className="seat-button-arrow">→</span>
          </button>
          {errors.preferredSeat && <span className="error-message">{errors.preferredSeat}</span>}
        </div>

        {/* Spacing Break with Line */}
        <div style={{ height: '15px' }}></div>
        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '15px 0' }} />
        <div style={{ height: '15px' }}></div>

        {/* Price Display with Fee Breakdown */}
        {formData.membershipType && formData.membershipDuration && formData.timeSlot && (
          <div className="price-display">
            <div className="price-card">
              <h3>Fee Structure Breakdown</h3>
              
              <div className="fee-breakdown">
                <div className="fee-breakdown-item">
                  <span className="fee-breakdown-label">Membership Type :</span>
                  <span className="fee-breakdown-value"> {formData.membershipType}</span>
                </div>
                
                <div className="fee-breakdown-item">
                  <span className="fee-breakdown-label">Time Slot :</span>
                  <span className="fee-breakdown-value">{formData.timeSlot}</span>
                </div>
                
                <div className="fee-breakdown-item">
                  <span className="fee-breakdown-label">Duration :</span>
                  <span className="fee-breakdown-value">{formData.membershipDuration}</span>
                </div>
                
                <div className="fee-breakdown-item">
                  <span className="fee-breakdown-label">Seat :</span>
                  <span className="fee-breakdown-value">{formData.preferredSeat || 'Not selected'}</span>
                </div>
                
                <div className="fee-breakdown-separator"></div>
                
                {/* Show price breakdown if applicable */}
                {(() => {
                  const isFemale = userData?.gender === 'female';
                  const userRegistrationDate = userData?.registrationDate;
                  const lastPackageDate = userData?.lastPackageDate;
                  const seatTier = getSeatTier(formData.preferredSeat);
                  
                  const basePrice = formData.membershipType === 'Calista Garden' 
                    ? 399 * (formData.membershipDuration.split(' ')[0] === '1' ? 1 : parseInt(formData.membershipDuration.split(' ')[0]))
                    : getPrice(formData.membershipDuration, formData.membershipType, formData.timeSlot);
                  
                  const priceWithSeatTier = applySeatTierPricing(basePrice, seatTier);
                  const totalDiscount = formData.membershipType === 'Calista Garden'
                    ? (isFemale && qualifiesForFemaleDiscount(formData.membershipDuration) ? 10 : 0)
                    : calculateTotalDiscount(formData.membershipDuration, formData.membershipType, formData.timeSlot, isFemale);
                  const registrationFee = shouldApplyRegistrationFee(userRegistrationDate, lastPackageDate) ? REGISTRATION_FEE : 0;
                  
                  const showBreakdown = totalDiscount > 0 || registrationFee > 0 || seatTier !== 'standard';
                  
                  if (showBreakdown) {
                    return (
                      <>
                        <div className="fee-breakdown-item">
                          <span className="fee-breakdown-label">Base Package Price :</span>
                          <span className="fee-breakdown-value">Rs.{basePrice}</span>
                        </div>
                        {seatTier !== 'standard' && (
                          <div className="fee-breakdown-item">
                            <span className="fee-breakdown-label">
                              {seatTier === 'silver' ? 'Silver Seat (+25%)' : 'Gold Seat (+50%)'}:
                            </span>
                            <span className="fee-breakdown-value">+Rs.{priceWithSeatTier - basePrice}</span>
                          </div>
                        )}
                        {totalDiscount > 0 && (
                          <div className="fee-breakdown-item discount">
                            <span className="fee-breakdown-label">Discount ({totalDiscount}%):</span>
                            <span className="fee-breakdown-value">-Rs.{Math.round(priceWithSeatTier * totalDiscount / 100)}</span>
                          </div>
                        )}
                        {registrationFee > 0 && (
                          <div className="fee-breakdown-item">
                            <span className="fee-breakdown-label">Registration Fee :</span>
                            <span className="fee-breakdown-value">Rs.{registrationFee}</span>
                          </div>
                        )}
                      </>
                    );
                  }
                  return null;
                })()}
                
                <div className="fee-breakdown-item total-fee">
                  <span className="fee-breakdown-label">Total Fee :</span>
                  <span className="fee-breakdown-value total-amount">Rs.{calculateTotalPrice()}</span>
                </div>
                
                <div className="fee-breakdown-note">
                  <p>* All fees are inclusive of applicable taxes</p>
                  <p>* Membership starts from selected date</p>
                  {(() => {
                    const userRegistrationDate = userData?.registrationDate;
                    const lastPackageDate = userData?.lastPackageDate;
                    const registrationFee = shouldApplyRegistrationFee(userRegistrationDate, lastPackageDate) ? REGISTRATION_FEE : 0;
                    
                    if (registrationFee > 0) {
                      return <p>* Registration fee is one-time and valid for 1 year from purchase</p>;
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Error */}
        {errors.submit && <div className="error-message">{errors.submit}</div>}
        
        {/* Submit Button */}
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </form>

      {/* Seat Selection Modal */}
      <SeatSelectionModal
        isOpen={showSeatModal}
        onClose={() => setShowSeatModal(false)}
        selectedSeat={formData.preferredSeat}
        onSeatSelect={handleSeatSelect}
        userData={userData}
        membershipType={formData.membershipType}
      />
    </div>
  );
}