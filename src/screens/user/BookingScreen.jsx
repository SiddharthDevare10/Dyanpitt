import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import CustomDropdown from '../../components/CustomDropdown';
import SeatSelectionModal from '../../components/SeatSelectionModal';
import DatePicker from '../../components/DatePicker';
import apiService from '../../services/api';
import '../../styles/priceBreakdown.css';
import logger from '../../utils/logger';
// Note: Using pricing data from backend API

export default function BookingScreen() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const isRenewal = searchParams.get('renewal') === 'true';
  
  const [formData, setFormData] = useState({
    timeSlot: '',
    membershipType: '',
    membershipDuration: '',
    membershipStartDate: '',
    preferredSeat: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);

  // Set default start date for renewals
  useEffect(() => {
    if (isRenewal && user?.bookings?.length > 0) {
      // Get the most recent active booking
      const activeBookings = user.bookings.filter(booking => booking.isActive && booking.membershipActive);
      const latestBooking = activeBookings.sort((a, b) => new Date(b.membershipEndDate) - new Date(a.membershipEndDate))[0];
      
      if (latestBooking?.membershipEndDate) {
        const endDate = new Date(latestBooking.membershipEndDate);
        const today = new Date();
        
        // If membership is still active, use end date as start date
        // Otherwise use today's date
        const defaultStartDate = endDate > today ? endDate : today;
        
        setFormData(prev => ({
          ...prev,
          membershipStartDate: defaultStartDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [isRenewal, user?.bookings]);
  

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
      // Validate start date is within 7 days (compare dates only, not times)
      const startDate = new Date(formData.membershipStartDate);
      startDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysFromToday = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      if (startDate < today) {
        newErrors.membershipStartDate = 'Start date cannot be in the past';
      } else if (startDate > sevenDaysFromToday) {
        newErrors.membershipStartDate = 'Start date must be within 7 days';
      }
    }
    
    if (!formData.preferredSeat) {
      newErrors.preferredSeat = 'Please select a preferred seat';
    }
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Form submission logging removed for production
    
    if (validateForm()) {
      // Form validation logging removed
      setIsLoading(true);
      try {
        // Check if we have auth token using the same method as API service
        const hasToken = apiService.getToken();
        // Auth verification logging removed
        
        if (hasToken) {
          // Save booking details to database with calculated total amount and fee breakdown
          const bookingData = {
            ...formData,
            totalAmount: calculateTotalPrice()
          };
          
          // Don't create booking yet - just pass data to payment screen
          // Navigation data logging removed
          
          // Navigate to payment screen with booking data (no booking created yet)
          navigate('/payment', {
            state: {
              bookingData: bookingData
            }
          });
        } else {
          // For users without auth token, still use the new system but pass data via state
          // Update user context with booking completion flag before navigation
          const updatedUser = {
            ...user,
            bookingCompleted: true,
            bookingDetails: {
              ...formData,
              totalAmount: calculateTotalPrice()
            }
          };
          
          updateUser(updatedUser);
          
          // Navigate to payment with booking data in state
          navigate('/payment', {
            state: {
              bookingData: {
                ...formData,
                tempBooking: true
              }
            }
          });
        }
      } catch (error) {
        setErrors({ submit: error.message || 'Failed to save booking details. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Time slots based on membership type
  const getTimeSlots = () => {
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
      label: 'Dyandhara Kaksh (ज्ञानधारा कक्ष)',
      stars: '',
      tier: 'Basic',
      features: ['Study room access', 'Basic seating', 'WiFi access', 'Reading materials', 'Affordable pricing'],
      maleOnly: true
    },
    { 
      value: 'Dyanpurn Kaksh', 
      label: 'Dyanpurn Kaksh (ज्ञानपूर्ण कक्ष)',
      stars: '',
      tier: 'Premium',
      features: ['Charging Point', 'Desk Light', 'Relaxed Chair', 'Softboard for Notes', 'Footrest'],
      maleOnly: true
    },
    { 
      value: 'Dyanasmi Kaksh', 
      label: 'Dyanasmi Kaksh (ज्ञानास्मी कक्ष)',
      stars: '',
      tier: 'Garden',
      features: ['Charging Point', 'Desk Light', 'Relaxed Chair', 'Softboard for Notes', 'Footrest'],
      isSpecial: true,
      specialPrice: 399,
      specialTimeSlot: 'Dyanasmi Kaksh (7:00 AM - 7:00 PM)',
      femaleOnly: true
    }
  ];

  const membershipTypes = getAllMembershipTypes().filter(membership => {
    // Filter out male-only memberships for female users
    if (user?.gender === 'female' && membership.maleOnly) {
      return false;
    }
    // Filter out female-only memberships for male users
    if (user?.gender === 'male' && membership.femaleOnly) {
      return false;
    }
    return true;
  });

  // Membership durations based on membership type
  const getMembershipDurations = () => {
    // All options for all memberships
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

  // Handle seat selection from seat selection modal
  const handleSeatSelect = (seatNumber) => {
    setFormData(prev => ({
      ...prev,
      preferredSeat: seatNumber
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
    } else if (formData.membershipType === 'Dyanasmi Kaksh') {
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
    
    // const isFemale = user?.gender === 'female';
    // const userRegistrationDate = user?.registrationDate;
    // const lastPackageDate = user?.lastPackageDate;
    const seatTier = getSeatTier(formData.preferredSeat);
    
    // Use standard pricing for all membership types including Dyanasmi Kaksh
    
    // Get price from backend pricing data
    let originalPrice = 0;
    try {
      // This should be replaced with API call to get pricing
      originalPrice = 299; // Fallback price
    } catch (error) {
      logger.error('Error getting price:', error);
      originalPrice = 299; // Fallback price
    }
    
    // Apply seat tier pricing
    originalPrice = applySeatTierPricing(originalPrice, seatTier);
    
    // Add registration fee to total
    return originalPrice + 50;
  };

  return ( /*  */
    <div className="main-container membership-details-adjustment">
      <button 
        onClick={() => navigate(-1)}
        className="back-button"
      >
        <ArrowLeft size={20} color="white" />
      </button>
      <div className="header-section">
        <h1 className="main-title">{isRenewal ? 'Renew Your Membership' : 'Book Your Seat'}</h1>
        <p className="main-subtitle">
          {isRenewal 
            ? 'Extend your membership with your preferred plan and duration' 
            : 'Choose your preferred time, membership plan, and duration'
          }
        </p>
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
          
          {/* Show features and pricing for selected membership - Hide for Dyandhara Kaksh */}
          {formData.membershipType && formData.membershipType !== 'Dyandhara Kaksh' && (
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
            placeholder="Choose duration"
            className="form-input"
            error={errors.membershipDuration}
          />
          {errors.membershipDuration && <span className="error-message">{errors.membershipDuration}</span>}
        </div>

        {/* Membership Start Date */}
        <div className="input-group">
          <label className="membership-input-label">
            Membership Start Date *
          </label>
          <div className="marathi-text">
            Membership must start within 7 days
          </div>
          <DatePicker
            name="membershipStartDate"
            value={formData.membershipStartDate}
            onChange={handleInputChange}
            className={errors.membershipStartDate ? 'input-error' : ''}
            error={!!errors.membershipStartDate}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
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
              if (formData.membershipType && formData.timeSlot && formData.membershipStartDate && formData.membershipDuration) {
                setShowSeatModal(true);
              }
            }}
            disabled={!formData.membershipType || !formData.timeSlot || !formData.membershipStartDate || !formData.membershipDuration}
          >
            {formData.preferredSeat ? `Seat ${formData.preferredSeat}` : 
             (formData.membershipType && formData.timeSlot && formData.membershipStartDate && formData.membershipDuration) ? 'Choose your preferred seat' : 'Fill all fields above first'}
            <span className="seat-button-arrow">→</span>
          </button>
          {errors.preferredSeat && <span className="error-message">{errors.preferredSeat}</span>}
        </div>
        
        {/* Price Breakdown */}
        {formData.membershipType && formData.membershipDuration && formData.timeSlot && (
          <div className="price-breakdown-container" style={{ margin: '2rem 0 1.5rem 0' }}>
            <div className="price-breakdown">
              <h3 className="price-breakdown-title">Price Summary</h3>
              
              <div className="price-breakdown-content">
                <div className="price-row">
                  <span className="price-label">Membership Plan</span>
                  <span className="price-amount">₹299</span>
                </div>
                
                <div className="price-row">
                  <span className="price-label">Registration Fee</span>
                  <span className="price-amount">₹50</span>
                </div>
                
                {formData.preferredSeat && getSeatTier(formData.preferredSeat) !== 'standard' && (
                  <div className="price-row">
                    <span className="price-label">Premium Seat Upgrade</span>
                    <span className="price-amount">
                      +₹{applySeatTierPricing(299, getSeatTier(formData.preferredSeat)) - 299}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="total-divider"></div>
              
              <div className="total-section">
                <div className="price-row total-row">
                  <span className="total-label">Total Amount</span>
                  <span className="total-amount">₹{calculateTotalPrice()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Error */}
        {errors.submit && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {errors.submit}
          </div>
        )}
        
        {/* Submit Button */}
        <button 
          type="submit" 
          className="login-button" 
          disabled={isLoading}
          style={{ marginTop: '1.5rem' }}
        >
          {isLoading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </form>

      {/* Seat Selection Modal */}
      {showSeatModal && formData.membershipType && (
        <SeatSelectionModal
          isOpen={showSeatModal}
          onClose={() => setShowSeatModal(false)}
          selectedSeat={formData.preferredSeat}
          onSeatSelect={handleSeatSelect}
          userData={user}
          membershipType={formData.membershipType}
          timeSlot={formData.timeSlot}
          membershipStartDate={formData.membershipStartDate}
          membershipDuration={formData.membershipDuration}
        />
      )}
    </div>
  );
}