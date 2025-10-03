import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Building, Banknote } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import apiService from '../../services/api';
import NotificationModal from '../../components/NotificationModal';
import CashPaymentSuccessModal from '../../components/CashPaymentSuccessModal';
// Note: Using pricing data from backend API

export default function PaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  
  // Notification state
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    actions: []
  });
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [cashTransactionId, setCashTransactionId] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [_loading, setLoading] = useState(true);
  
  // Cash payment modal state (keeping for legacy support)
  const [showCashPaymentModal, setShowCashPaymentModal] = useState(false);

  const bookingId = searchParams.get('bookingId');

  // Load booking data
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        if (bookingId) {
          // Load booking from database
          const response = await apiService.request(`/booking/${bookingId}`);
          if (response.success) {
            setBookingData(response.data);
          } else {
            setErrors({ general: 'Booking not found' });
          }
        } else if (location.state?.bookingData) {
          // Use booking data from navigation state (temporary bookings)
          setBookingData(location.state.bookingData);
        } else {
          setErrors({ general: 'No booking data found' });
        }
      } catch (_error) {
        setErrors({ general: 'Failed to load booking data' });
      } finally {
        setLoading(false);
      }
    };

    loadBookingData();
  }, [bookingId, location.state]);


  const paymentMethods = [
    {
      id: 'upi',
      name: 'Digital UPI Payment',
      icon: <Smartphone size={24} />,
      description: 'Instant payment via GPay, PhonePe, Paytm, or any UPI app'
    },
    {
      id: 'cash',
      name: 'Cash Payment at Center',
      icon: <Banknote size={24} />,
      description: 'Pay cash directly to admin at Dyanpitt study center'
    }
  ];

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
    setErrors({});
  };

  const generateCashTransactionId = () => {
    const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year
    const transactionNumber = Math.floor(Math.random() * 99999) + 1; // Random number 1-99999
    const paddedNumber = transactionNumber.toString().padStart(5, '0'); // Pad with zeros
    return `TRXNCSH${year}${paddedNumber}`;
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      setErrors({ payment: 'Please select a payment method' });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      if (selectedPaymentMethod === 'cash') {
        // Handle cash payment - create booking immediately with pending status
        const response = await apiService.request('/booking/create-cash-booking', {
          method: 'POST',
          body: JSON.stringify(bookingData)
        });
        
        if (response.success) {
          // Update user context with the actual booking details
          updateUser({
            ...user,
            bookingDetails: response.data.bookingDetails,
            bookingCompleted: true // Booking is created, but payment is pending
          });
          
          // Redirect to cash payment pending page with actual booking data
          navigate('/cash-payment-pending', {
            state: {
              bookingData: response.data.bookingDetails
            }
          });
        } else {
          setErrors({ payment: response.message || 'Failed to create cash payment request' });
        }
      } else {
        // Handle UPI payment - simulate processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Generate mock payment ID and transaction ID
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Complete payment and create booking in backend
        const response = await apiService.request('/booking/create', {
          method: 'POST',
          body: JSON.stringify({
            ...bookingData,
            paymentId: paymentId,
            paymentMethod: selectedPaymentMethod,
            transactionId: transactionId,
            paymentStatus: 'completed'
          })
        });
        
        if (response.success) {
          // Check if Dyanpitt ID was generated
          if (response.dyanpittId && !user.hasDnyanpittId) {
            // Dyanpitt ID generated! Show congratulations
            updateUser({
              ...user,
              dyanpittId: response.dyanpittId,
              hasDnyanpittId: true,
              showCongratulations: true,
              bookingCompleted: true,
              paymentCompleted: true
            });
            navigate('/congratulations');
          } else {
            // Regular payment completion without Dyanpitt ID generation
            setNotification({
              isOpen: true,
              type: 'success',
              title: 'Payment Successful',
              message: 'Your payment has been completed successfully!',
              actions: [
                {
                  label: 'Go to Dashboard',
                  variant: 'primary',
                  onClick: () => {
                    updateUser({
                      ...user,
                      bookingCompleted: true,
                      paymentCompleted: true
                    });
                    setNotification({ ...notification, isOpen: false });
                    navigate('/dashboard');
                  }
                }
              ]
            });
          }
        } else {
          setErrors({ payment: response.message || 'Payment failed' });
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrors({ payment: 'Payment failed. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Use bookingData from the new system, fallback to legacy user.bookingDetails
  const bookingDetails = bookingData || user?.bookingDetails;
  
  // Calculate pricing breakdown
  const calculatePriceBreakdown = () => {
    if (!bookingDetails) return null;
    
    const isFemale = user?.gender === 'female';
    const userRegistrationDate = user?.registrationDate;
    const lastPackageDate = user?.lastPackageDate;
    
    // Get seat tier
    const getSeatTier = (seatId) => {
      if (!seatId) return 'standard';
      const seatNum = parseInt(seatId.match(/\d+$/)?.[0] || '0');
      const sectionLetter = seatId.charAt(0);
      
      if (bookingDetails?.membershipType === 'Dyandhara Kaksh') {
        if (seatNum === 5) return 'gold';
        if ([24, 25, 26, 27, 28, 29, 32, 33].includes(seatNum)) return 'silver';
        return 'standard';
      } else if (bookingDetails?.membershipType === 'Dyanpurn Kaksh') {
        if (sectionLetter === 'A' && [54, 55, 56].includes(seatNum)) return 'silver';
        if (sectionLetter === 'B' && [63, 64, 65].includes(seatNum)) return 'silver';
        if (sectionLetter === 'C' && seatNum === 69) return 'gold';
        return 'standard';
      }
      return 'standard';
    };
    
    const seatTier = getSeatTier(bookingDetails?.preferredSeat);
    
    // Calculate base price
    let basePrice = 0;
    // Use pricing data for all memberships
    {
      // Get price from backend pricing data
      basePrice = 299; // Fallback price - should be replaced with API call
    }
    
    // Apply seat tier pricing
    const applySeatTierPricing = (price, tier) => {
      switch (tier) {
        case 'silver': return Math.round(price * 1.25);
        case 'gold': return Math.round(price * 1.50);
        default: return price;
      }
    };
    
    const priceWithSeatTier = applySeatTierPricing(basePrice, seatTier);
    
    // Simplified pricing without complex discount logic
    const totalDiscount = 0;
    const discountAmount = 0;
    const registrationFee = 0;
    
    return {
      basePrice,
      seatTier,
      priceWithSeatTier,
      seatTierSurcharge: priceWithSeatTier - basePrice,
      totalDiscount,
      discountAmount,
      registrationFee,
      finalAmount: priceWithSeatTier - discountAmount + registrationFee
    };
  };

  const priceBreakdown = calculatePriceBreakdown();

  return (
    <div className="main-container membership-details-adjustment">
      <button 
        onClick={() => navigate(-1)}
        className="back-button"
        disabled={isProcessing}
      >
        <ArrowLeft size={20} color="white" />
      </button>
      
      <div className="header-section">
        <h1 className="main-title">Payment</h1>
        <p className="main-subtitle">Complete your booking payment</p>
      </div>

      {/* Booking Summary */}
      <div className="input-group">
        <label className="input-label">Booking Summary</label>
        <div className="booking-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label"> Preferred Time Slot</span>
              <span className="info-value">{bookingDetails?.timeSlot}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Membership Type</span>
              <span className="info-value">{bookingDetails?.membershipType}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Membership Duration</span>
              <span className="info-value">{bookingDetails?.membershipDuration}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Membership Start Date</span>
              <span className="info-value">{bookingDetails?.membershipStartDate ? new Date(bookingDetails.membershipStartDate).toLocaleDateString() : 'Not set'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Preferred Seat</span>
              <span className="info-value">{bookingDetails?.preferredSeat}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      {priceBreakdown && (
        <div className="input-group">
          <label className="input-label">Price Breakdown</label>
          <div className="payment-calculation">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Base Package Price</span>
                <span className="info-value">₹{priceBreakdown.basePrice}</span>
              </div>
              {priceBreakdown.seatTier !== 'standard' && (
                <div className="info-item">
                  <span className="info-label">{priceBreakdown.seatTier === 'silver' ? 'Silver Seat (+25%)' : 'Gold Seat (+50%)'}</span>
                  <span className="info-value surcharge">+₹{priceBreakdown.seatTierSurcharge}</span>
                </div>
              )}
              {priceBreakdown.totalDiscount > 0 && (
                <div className="info-item">
                  <span className="info-label">Discount ({priceBreakdown.totalDiscount}%)</span>
                  <span className="info-value discount">-₹{priceBreakdown.discountAmount}</span>
                </div>
              )}
              {priceBreakdown.registrationFee > 0 && (
                <div className="info-item">
                  <span className="info-label">Registration Fee</span>
                  <span className="info-value">₹{priceBreakdown.registrationFee}</span>
                </div>
              )}
              <div className="info-item total-amount">
                <span className="info-label">Total Amount</span>
                <span className="info-value">₹{priceBreakdown.finalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="input-group">
        <label className="input-label">Select Payment Method *</label>
        <div className="payment-methods-section">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`payment-method-option ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
              onClick={() => handlePaymentMethodSelect(method.id)}
            >
              <div className="payment-method-content">
                <div className="payment-method-icon">{method.icon}</div>
                <div className="payment-method-details">
                  <span className="payment-method-name">{method.name}</span>
                  <span className="payment-method-desc">{method.description}</span>
                </div>
              </div>
              <div className="payment-selection-indicator">
                <div className={`selection-circle ${selectedPaymentMethod === method.id ? 'selected' : ''}`}></div>
              </div>
            </div>
          ))}
        </div>
        {errors.payment && <span className="error-message">{errors.payment}</span>}
      </div>

      {/* Payment Button */}
      <button 
        onClick={handlePayment}
        className="login-button login-screen-submit-button"
        disabled={isProcessing || !selectedPaymentMethod}
      >
        {isProcessing ? (
          <div className="payment-processing">
            <div className="login-screen-spinner"></div>
            Processing Payment...
          </div>
        ) : (
          `Pay ₹${priceBreakdown?.finalAmount || 0}`
        )}
      </button>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        actions={notification.actions}
      />

      <CashPaymentSuccessModal
        isOpen={showCashPaymentModal}
        onClose={() => setShowCashPaymentModal(false)}
        onContinue={() => {
          setShowCashPaymentModal(false);
          navigate('/dashboard');
        }}
        transactionId={cashTransactionId}
      />

    </div>
  );
}