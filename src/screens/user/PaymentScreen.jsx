import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Building, Banknote } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import apiService from '../../services/api';
import NotificationModal from '../../components/NotificationModal';
import CashPaymentSuccessModal from '../../components/CashPaymentSuccessModal';
import { formatISTDate } from '../../utils/istUtils.js';
import logger from '../../utils/logger';
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
  const [cashTransactionId] = useState('');
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
      } catch {
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
      name: 'UPI Payment (Razorpay)',
      icon: <Smartphone size={24} />,
      description: 'Secure payment via GPay, PhonePe, Paytm, or any UPI app using Razorpay'
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

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      setErrors({ payment: 'Please select a payment method' });
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      if (selectedPaymentMethod === 'cash') {
        // Debug authentication before making request
        
        // Check if user is authenticated
        if (!user || !apiService.isAuthenticated()) {
          setErrors({ payment: 'You are not logged in. Please log in again.' });
          setIsProcessing(false);
          return;
        }
        
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
          // Handle seat already occupied error
          if (response.code === 'SEAT_ALREADY_OCCUPIED') {
            setErrors({ 
              payment: `${response.message} Please go back and select a different seat.` 
            });
          } else {
            setErrors({ payment: response.message || 'Failed to create cash payment request' });
          }
        }
      } else if (selectedPaymentMethod === 'upi') {
        // Handle Razorpay UPI payment
        try {
          // Step 1: Create Razorpay order
          const orderResponse = await apiService.request('/booking/create-razorpay-order', {
            method: 'POST',
            body: JSON.stringify({
              amount: priceBreakdown?.finalAmount || bookingData.totalAmount || 0,
              currency: 'INR',
              bookingData: {
                ...bookingData,
                totalAmount: priceBreakdown?.finalAmount || bookingData.totalAmount || 0
              }
            })
          });

          if (!orderResponse.success) {
            // Handle different error types
            if (orderResponse.code === 'SEAT_ALREADY_OCCUPIED') {
              setErrors({ 
                payment: `${orderResponse.message} Please go back and select a different seat.` 
              });
            } else if (orderResponse.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED') {
              setErrors({ 
                payment: 'UPI payment is temporarily unavailable. Please use cash payment option or contact administrator.' 
              });
            } else {
              setErrors({ payment: orderResponse.message || 'Failed to create payment order' });
            }
            return;
          }

          const { orderId, amount, currency, keyId } = orderResponse.data;

          // Step 2: Open Razorpay checkout
          const options = {
            key: keyId,
            amount: amount, // Amount in paise
            currency: currency,
            name: 'Dyanpeeth Abhyasika',
            description: `${bookingData.membershipType} - ${bookingData.membershipDuration}`,
            order_id: orderId,
            prefill: {
              name: user.fullName,
              email: user.email,
              contact: user.phoneNumber
            },
            method: {
              upi: true,
              card: false,
              netbanking: false,
              wallet: false,
              paylater: false
            },
            theme: {
              color: '#2563eb'
            },
            modal: {
              ondismiss: function() {
                logger.info('Payment modal closed by user');
                setIsProcessing(false);
              }
            },
            handler: async function (response) {
              logger.info('🎉 Payment successful:', response);
              
              try {
                // Step 3: Verify payment with backend
                const verificationResponse = await apiService.request('/booking/verify-razorpay-payment', {
                  method: 'POST',
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    bookingData: {
                      ...bookingData,
                      totalAmount: priceBreakdown?.finalAmount || bookingData.totalAmount || 0
                    }
                  })
                });

                if (verificationResponse.success) {
                  // Payment verified successfully
                  const { booking, dyanpittId, transactionId } = verificationResponse.data;
                  
                  // Check if Dyanpitt ID was generated
                  if (dyanpittId && !user.hasDnyanpittId) {
                    // Dyanpitt ID generated! Show congratulations
                    updateUser({
                      ...user,
                      dyanpittId: dyanpittId,
                      hasDnyanpittId: true,
                      showCongratulations: true,
                      bookingCompleted: true,
                      paymentCompleted: true,
                      bookingDetails: booking
                    });
                    navigate('/congratulations', {
                      state: {
                        fromPayment: true,
                        bookingDetails: booking,
                        transactionId: transactionId,
                        dyanpittId: dyanpittId
                      }
                    });
                  } else {
                    // Regular payment completion
                    updateUser({
                      ...user,
                      bookingCompleted: true,
                      paymentCompleted: true,
                      bookingDetails: booking
                    });
                    navigate('/congratulations', {
                      state: {
                        fromPayment: true,
                        bookingDetails: booking,
                        transactionId: transactionId,
                        dyanpittId: user.dyanpittId
                      }
                    });
                  }
                } else {
                  setErrors({ payment: verificationResponse.message || 'Payment verification failed' });
                }
              } catch (verifyError) {
                logger.error('Payment verification error:', verifyError);
                setErrors({ payment: 'Payment verification failed. Please contact support.' });
              } finally {
                setIsProcessing(false);
              }
            }
          };

          // Check if Razorpay is available
          if (typeof window.Razorpay === 'undefined') {
            setErrors({ payment: 'Payment system not loaded. Please refresh the page and try again.' });
            return;
          }

          const razorpayInstance = new window.Razorpay(options);
          
          razorpayInstance.on('payment.failed', function (response) {
            logger.error('❌ Payment failed:', response.error);
            setErrors({ 
              payment: `Payment failed: ${response.error.description || 'Please try again'}` 
            });
            setIsProcessing(false);
          });

          // Open the payment modal
          razorpayInstance.open();

        } catch (error) {
          logger.error('Razorpay payment error:', error);
          setErrors({ payment: 'Failed to initiate payment. Please try again.' });
        }
      } else {
        setErrors({ payment: 'Invalid payment method selected' });
      }
    } catch (error) {
      logger.error('Payment error:', error);
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
    <div className="main-container membership-details-adjustment payment-page-container">
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
      <div className="booking-summary">
        <h3 className="payment-section-header">Booking Summary</h3>
        <div className="payment-details-grid">
          <div className="payment-detail-row">
            <span className="payment-detail-label">Time Slot</span>
            <span className="payment-detail-value">{bookingDetails?.timeSlot || 'Not selected'}</span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Membership Type</span>
            <span className="payment-detail-value">{bookingDetails?.membershipType || 'Not specified'}</span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Duration</span>
            <span className="payment-detail-value">{bookingDetails?.membershipDuration || 'Not specified'}</span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Start Date</span>
            <span className="payment-detail-value">{formatISTDate(bookingDetails?.membershipStartDate) || 'Not set'}</span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Seat</span>
            <span className="payment-detail-value">{bookingDetails?.preferredSeat || 'Not selected'}</span>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      {priceBreakdown && (
        <div className="price-breakdown-summary">
          <h3 className="payment-section-header">Price Breakdown</h3>
          <div className="breakdown-details">
            <div className="breakdown-item">
              <span className="breakdown-label">Base Package Price</span>
              <span className="breakdown-value">₹{priceBreakdown.basePrice}</span>
            </div>
            {priceBreakdown.seatTier !== 'standard' && (
              <div className="breakdown-item">
                <span className="breakdown-label">{priceBreakdown.seatTier === 'silver' ? 'Silver Seat (+25%)' : 'Gold Seat (+50%)'}</span>
                <span className="breakdown-value surcharge">+₹{priceBreakdown.seatTierSurcharge}</span>
              </div>
            )}
            {priceBreakdown.totalDiscount > 0 && (
              <div className="breakdown-item discount">
                <span className="breakdown-label">Discount ({priceBreakdown.totalDiscount}%)</span>
                <span className="breakdown-value">-₹{priceBreakdown.discountAmount}</span>
              </div>
            )}
            {priceBreakdown.registrationFee > 0 && (
              <div className="breakdown-item">
                <span className="breakdown-label">Registration Fee</span>
                <span className="breakdown-value">₹{priceBreakdown.registrationFee}</span>
              </div>
            )}
            <div className="breakdown-item total">
              <span className="breakdown-label">Total Amount</span>
              <span className="breakdown-value">₹{priceBreakdown.finalAmount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="payment-methods">
        <h3 className="payment-section-header">Select Payment Method *</h3>
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
        {errors.payment && <span className="error-message">{errors.payment}</span>}
      </div>

      {/* Payment Button */}
      <button 
        onClick={handlePayment}
        className="payment-button"
        disabled={isProcessing || !selectedPaymentMethod}
      >
        {isProcessing ? (
          <div className="processing-payment">
            <div className="payment-spinner"></div>
            {selectedPaymentMethod === 'upi' ? 'Opening Razorpay...' : 'Processing Payment...'}
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