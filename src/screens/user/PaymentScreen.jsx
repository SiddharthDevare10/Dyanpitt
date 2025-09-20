import { useState } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Building, Banknote } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import apiService from '../../services/api';
import { getPrice } from '../../data/pricing';
// Removed discounts import - using simple pricing

export default function PaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  // Get payment amount from navigation state or user object
  const paymentAmount = location.state?.paymentAmount || user?.paymentAmount || user?.bookingDetails?.totalAmount;


  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI Payment',
      icon: <Smartphone size={24} />,
      description: 'Pay using UPI apps like GPay, PhonePe, Paytm'
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      icon: <Banknote size={24} />,
      description: 'Pay in cash at the center'
    }
  ];

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
    setErrors({});
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      setErrors({ payment: 'Please select a payment method' });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock payment ID
      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Complete payment in backend
      const response = await apiService.completePayment(paymentId, 'completed');
      
      if (response.success) {
        // Check if Dyanpitt ID was generated
        if (response.dyanpittId && response.showCongratulations) {
          // Dyanpitt ID generated! Show congratulations and force re-login
          
          // Navigate to congratulations screen with new Dyanpitt ID
          updateUser({
            ...user,
            ...response.user,
            dyanpittId: response.dyanpittId,
            showCongratulations: true,
            bookingCompleted: true,
            paymentCompleted: true
          });
          navigate('/congratulations');
        } else {
          // Regular payment completion without Dyanpitt ID generation
          alert('Payment completed successfully!');
          updateUser({
            ...user,
            ...response.user,
            bookingCompleted: true,
            paymentCompleted: true
          });
          navigate('/dashboard');
        }
      } else {
        setErrors({ payment: response.message || 'Payment failed' });
      }
    } catch {
      setErrors({ payment: 'Payment failed. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const { bookingDetails } = user || {};
  
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
      basePrice = getPrice(bookingDetails?.membershipDuration, bookingDetails?.membershipType, bookingDetails?.timeSlot);
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

      <div className="payment-container">
        {/* Booking Summary */}
        <div className="booking-summary">
          <h3>Booking Summary</h3>
          <div className="summary-details">
            <div className="summary-item">
              <span>Time Slot:</span>
              <span>{bookingDetails?.timeSlot}</span>
            </div>
            <div className="summary-item">
              <span>Membership Type:</span>
              <span>{bookingDetails?.membershipType}</span>
            </div>
            <div className="summary-item">
              <span>Duration:</span>
              <span>{bookingDetails?.membershipDuration}</span>
            </div>
            <div className="summary-item">
              <span>Start Date:</span>
              <span>{new Date(bookingDetails?.membershipStartDate).toLocaleDateString()}</span>
            </div>
            <div className="summary-item">
              <span>Seat:</span>
              <span>{bookingDetails?.preferredSeat}</span>
            </div>
          </div>
        </div>

        {/* Detailed Price Breakdown */}
        {priceBreakdown && (
          <div className="price-breakdown-summary">
            <h3>Price Breakdown</h3>
            <div className="breakdown-details">
              <div className="breakdown-item">
                <span>Base Package Price:</span>
                <span>₹{priceBreakdown.basePrice}</span>
              </div>
              {priceBreakdown.seatTier !== 'standard' && (
                <div className="breakdown-item">
                  <span>{priceBreakdown.seatTier === 'silver' ? 'Silver Seat (+25%)' : 'Gold Seat (+50%)'}:</span>
                  <span>+₹{priceBreakdown.seatTierSurcharge}</span>
                </div>
              )}
              {priceBreakdown.totalDiscount > 0 && (
                <div className="breakdown-item discount">
                  <span>Discount ({priceBreakdown.totalDiscount}%):</span>
                  <span>-₹{priceBreakdown.discountAmount}</span>
                </div>
              )}
              {priceBreakdown.registrationFee > 0 && (
                <div className="breakdown-item">
                  <span>Registration Fee:</span>
                  <span>₹{priceBreakdown.registrationFee}</span>
                </div>
              )}
              <div className="breakdown-separator"></div>
              <div className="breakdown-item total">
                <span>Total Amount:</span>
                <span>₹{paymentAmount || priceBreakdown.finalAmount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="payment-methods">
          <h3>Select Payment Method</h3>
          <div className="payment-options">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`payment-option ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                onClick={() => handlePaymentMethodSelect(method.id)}
              >
                <div className="payment-icon">{method.icon}</div>
                <div className="payment-details">
                  <h4>{method.name}</h4>
                  <p>{method.description}</p>
                </div>
                <div className="payment-radio">
                  <div className={`radio-custom ${selectedPaymentMethod === method.id ? 'checked' : ''}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {errors.payment && <div className="error-message">{errors.payment}</div>}

        {/* Payment Button */}
        <button 
          onClick={handlePayment}
          className="payment-button"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="processing-payment">
              <div className="payment-spinner"></div>
              Processing Payment...
            </div>
          ) : (
            `Pay ₹${paymentAmount || priceBreakdown?.finalAmount || 0}`
          )}
        </button>
      </div>
    </div>
  );
}