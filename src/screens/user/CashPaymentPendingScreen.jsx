import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { CheckCircle, Clock, Phone, MapPin, AlertCircle, LogOut, ArrowRight } from 'lucide-react';
import apiService from '../../services/api';

export default function CashPaymentPendingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('cash_pending');
  const [isPaymentCollected, setIsPaymentCollected] = useState(false);

  useEffect(() => {
    // Get booking data from location state or user data
    const data = location.state?.bookingData || user?.bookingDetails;
    
    if (!data) {
      // If no booking data, redirect to dashboard
      navigate('/dashboard');
      return;
    }
    
    console.log('🔍 Booking data received:', data);
    setBookingData(data);
    setPaymentStatus(data.paymentStatus || 'cash_pending');
    setIsPaymentCollected(data.paymentStatus === 'cash_collected');
    setLoading(false);
  }, [location.state, user, navigate]);

  // Timer for 48-hour deadline
  useEffect(() => {
    if (!bookingData) return;

    // Set a fixed booking time when component mounts
    const bookedTime = bookingData.bookedAt ? new Date(bookingData.bookedAt) : new Date();
    const deadline = new Date(bookedTime.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    const updateTimer = () => {
      const now = new Date();
      const remaining = deadline - now;

      console.log('Timer Debug:', {
        bookedAt: bookingData.bookedAt,
        bookedTime: bookedTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        deadline: deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        now: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        remaining: remaining,
        remainingHours: remaining / (1000 * 60 * 60)
      });

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
      } else {
        setIsExpired(false);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
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
        // Check user's current booking status
        const response = await apiService.request('/auth/me');
        if (response.success && response.user) {
          const currentBooking = response.user.bookingDetails;
          console.log('🔍 Current booking from API:', currentBooking);
          if (currentBooking && currentBooking.paymentStatus === 'cash_collected') {
            console.log('✅ Payment confirmed by admin!');
            setIsPaymentCollected(true);
            setPaymentStatus('cash_collected');
            // Update booking data with latest info
            setBookingData(currentBooking);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    // Check immediately when component mounts
    checkPaymentStatus();
    
    // Then check every 15 seconds for faster updates
    const interval = setInterval(checkPaymentStatus, 15000);
    return () => clearInterval(interval);
  }, [bookingData, isPaymentCollected, isExpired]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
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
      return new Date(dateString).toLocaleDateString('en-US', {
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
    <div className="main-container">
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

      {/* Booking Summary Card */}
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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingBottom: '8px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Transaction ID:</span>
            <span style={{ 
              fontSize: '14px', 
              color: '#000000', 
              fontWeight: '600',
              fontFamily: 'monospace',
              backgroundColor: '#f3f4f6',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {bookingData.transactionId || bookingData.paymentId || 'N/A'}
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingBottom: '8px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Membership Type:</span>
            <span style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.membershipType}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingBottom: '8px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Duration:</span>
            <span style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.membershipDuration}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingBottom: '8px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Time Slot:</span>
            <span style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.timeSlot}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingBottom: '8px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Start Date:</span>
            <span style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{formatDate(bookingData.membershipStartDate)}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            paddingBottom: '8px', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>End Date:</span>
            <span style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{formatDate(bookingData.membershipEndDate)}</span>
          </div>
          
          {bookingData.preferredSeat && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              paddingBottom: '8px', 
              borderBottom: '1px solid #e5e7eb' 
            }}>
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Preferred Seat:</span>
              <span style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.preferredSeat}</span>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            backgroundColor: '#f0fdf4', 
            borderRadius: '8px', 
            padding: '12px',
            marginTop: '8px'
          }}>
            <span style={{ fontSize: '16px', color: '#065f46', fontWeight: '600' }}>Total Amount:</span>
            <span style={{ fontSize: '18px', color: '#000000', fontWeight: '600' }}>₹{bookingData.totalAmount}</span>
          </div>
        </div>
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