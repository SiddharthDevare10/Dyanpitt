import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CheckCircle, Clock, Phone, MapPin, AlertCircle, LogOut, ArrowRight } from 'lucide-react';
import apiService from '../../services/api';
import { formatRemainingTime } from '../../utils/istUtils.js';
import logger from '../../utils/logger';

export default function CashPaymentPendingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaymentCollected, setIsPaymentCollected] = useState(false);

  useEffect(() => {
    // Get booking data from location state or user bookings array
    let data = location.state?.bookingData;
    
    // If no data in location state, find cash pending booking from user's bookings
    if (!data && user?.bookings) {
      data = user.bookings.find(booking => booking.paymentStatus === 'cash_pending');
    }
    
    if (!data) {
      // If no cash pending booking found, redirect to dashboard
      navigate('/dashboard');
      return;
    }
    
    setBookingData(data);
    setIsPaymentCollected(data.paymentStatus === 'cash_collected');
    setLoading(false);
  }, [location.state, user, navigate]);

  // Timer for 48-hour deadline (IST)
  useEffect(() => {
    if (!bookingData) return;

    // Calculate deadline: 48 hours from booking time (consistent with cleanup service)
    const bookedTime = bookingData.bookedAt ? new Date(bookingData.bookedAt) : new Date();
    const deadline = new Date(bookedTime.getTime() + (48 * 60 * 60 * 1000));
    
    // Temporary debug - remove after verification

    const updateTimer = () => {
      const now = new Date();
      const remaining = deadline.getTime() - now.getTime();


      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
      } else {
        setIsExpired(false);
        const timeComponents = formatRemainingTime(remaining);
        setTimeRemaining(timeComponents);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [bookingData]);

  // Check payment status periodically
  useEffect(() => {
    if (!bookingData || isPaymentCollected || isExpired) return;

    const checkPaymentStatus = async () => {
      try {
        // Check user's current booking status from bookings array
        const response = await apiService.request('/auth/me');
        if (response.success && response.user && response.user.bookings) {
          // Find the current cash payment booking (should now be cash_collected)
          const currentBooking = response.user.bookings.find(booking => 
            booking._id === bookingData._id || booking.paymentStatus === 'cash_collected'
          );
          
          
          if (currentBooking && currentBooking.paymentStatus === 'cash_collected') {
            
            // Navigate to congratulations page with booking data and dyanpitt ID
            navigate('/congratulations', { 
              state: { 
                fromCashPayment: true,
                bookingData: currentBooking,
                dyanpittId: response.user.dyanpittId,
                membershipDetails: {
                  membershipType: currentBooking.membershipType,
                  timeSlot: currentBooking.timeSlot,
                  membershipDuration: currentBooking.membershipDuration,
                  membershipStartDate: currentBooking.membershipStartDate,
                  membershipEndDate: currentBooking.membershipEndDate
                }
              }
            });
            return; // Stop further polling
          }
        }
      } catch (error) {
        logger.error('Error checking payment status:', error);
      }
    };

    // Check immediately when component mounts
    checkPaymentStatus();
    
    // Then check every 15 seconds for faster updates
    const interval = setInterval(checkPaymentStatus, 15000);
    return () => clearInterval(interval);
  }, [bookingData, isPaymentCollected, isExpired, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Logout error:', error);
      navigate('/login');
    }
  };

  const handleNextStep = () => {
    navigate('/congratulations', { 
      state: { 
        bookingData: bookingData,
        transactionId: bookingData.transactionId || bookingData.paymentId,
        dyanpittId: user?.dyanpittId || 'DA2024001', // Use actual Dyanpeeth ID
        fromPayment: true
      } 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container cash-payment-pending-container">
      {/* Header Section with Payment Status */}
      <div className="header-section">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {isPaymentCollected ? (
            <CheckCircle size={60} color="#10b981" style={{ margin: '0 auto 16px' }} />
          ) : isExpired ? (
            <AlertCircle size={60} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          ) : (
            <Clock size={60} color="#5B5B5B" style={{ margin: '0 auto 16px' }} />
          )}
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            Payment Status: 
          </div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: isPaymentCollected ? '#10b981' : isExpired ? '#ef4444' : '#5B5B5B',
            marginTop: '4px'
          }}>
            {isPaymentCollected ? 'Collected' : isExpired ? 'Expired' : 'Pending'}
          </div>
        </div>

        {/* Live Timer Display in Title Position */}
        {!isPaymentCollected ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: isExpired ? '#dc2626' : '#000000', 
              fontFamily: 'monospace',
              letterSpacing: '2px',
              marginBottom: '8px'
            }}>
              {isExpired ? '00:00:00' : 
               timeRemaining ? 
               `${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')}` : 
               '48:00:00'}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: isExpired ? '#dc2626' : '#92400e', 
              fontWeight: '600' 
            }}>
              {isExpired ? 'Payment Deadline Expired' : 'Payment Deadline Remaining'}
            </div>
          </div>
        ) : (
          <h1 className="main-title" style={{ textAlign: 'center' }}>
            Payment Successful!
          </h1>
        )}
        
        <p className="main-subtitle" style={{ textAlign: 'center' }}>
          {isPaymentCollected ? 
            '🎉 Congratulations! Your cash payment has been successfully collected at our center. Your membership is now active!' :
            isExpired ?
            'Your booking has expired. Please create a new booking.' :
            'Your booking is confirmed! Please visit our center during payment counter hours (9:00 AM - 8:00 PM) to complete your cash payment.'
          }
        </p>

        {isExpired && (
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #ef4444', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
              ⚠️ Booking Expired
            </div>
            <p style={{ fontSize: '14px', color: '#dc2626' }}>
              Your 48-hour payment window has expired. Please create a new booking.
            </p>
          </div>
        )}
      </div>

      {/* Booking Summary Card - 7x2 Grid Layout */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #dddddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '16px',
          fontSize: '16px',
          fontWeight: '600',
          color: '#000000'
        }}>
          <CheckCircle size={20} color="#10b981" style={{ marginRight: '8px' }} />
          Booking Summary
        </div>
        
        {/* 7x2 Mobile Grid - 7 Rows Vertical, 2 Columns Horizontal */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1px',
          backgroundColor: '#e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}>
          
          {/* Row 1: Transaction ID */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            Transaction ID
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e293b',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            wordBreak: 'break-all'
          }}>
            {bookingData.transactionId || bookingData.paymentId || 'N/A'}
          </div>
          
          {/* Row 2: Membership Type */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            Membership Type
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center'
          }}>
            {bookingData.membershipType}
          </div>
          
          {/* Row 3: Duration */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            Duration
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center'
          }}>
            {bookingData.membershipDuration}
          </div>
          
          {/* Row 4: Time Slot */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            Time Slot
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            lineHeight: '1.3'
          }}>
            {bookingData.timeSlot}
          </div>
          
          {/* Row 5: Start Date */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            Start Date
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center'
          }}>
            {formatDate(bookingData.membershipStartDate)}
          </div>
          
          {/* Row 6: End Date */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            End Date
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center'
          }}>
            {formatDate(bookingData.membershipEndDate)}
          </div>
          
          {/* Row 7: Total Amount */}
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}>
            Total Amount
          </div>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#d1fae5',
            fontSize: '16px',
            fontWeight: '700',
            color: '#059669',
            display: 'flex',
            alignItems: 'center'
          }}>
            ₹{bookingData.totalAmount}
          </div>
        </div>
        
        {/* Additional Details Row (if preferred seat exists) */}
        {bookingData.preferredSeat && (
          <div style={{ 
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
            textAlign: 'center'
          }}>
            <span style={{ 
              fontSize: '12px', 
              color: '#1e40af', 
              fontWeight: '600',
              marginRight: '8px'
            }}>
              Preferred Seat:
            </span>
            <span style={{ 
              fontSize: '14px', 
              color: '#1e293b', 
              fontWeight: '700',
              backgroundColor: '#ffffff',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #93c5fd'
            }}>
              {bookingData.preferredSeat}
            </span>
          </div>
        )}
      </div>



      {/* Action Buttons */}
      <div style={{ textAlign: 'center' }}>
        {isPaymentCollected ? (
          <button 
            onClick={handleNextStep}
            className="login-button"
            style={{ 
              backgroundColor: '#10b981', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            <ArrowRight size={16} style={{ marginRight: '8px' }} />
            Next
          </button>
        ) : isExpired ? (
          <button 
            onClick={handleLogout}
            className="login-button"
            style={{ 
              backgroundColor: '#dc2626',
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <LogOut size={16} style={{ marginRight: '8px' }} />
            Back to Login
          </button>
        ) : (
          <button 
            onClick={handleLogout}
            className="login-button"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <LogOut size={16} style={{ marginRight: '8px' }} />
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}