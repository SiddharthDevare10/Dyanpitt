import { Check, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import logger from '../../utils/logger';

export default function CongratulationsScreen({ email }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Check if coming from payment completion (regular payment or cash payment)
  const fromPayment = location.state?.fromPayment;
  const fromCashPayment = location.state?.fromCashPayment;
  const dyanpittId = location.state?.dyanpittId || user?.dyanpittId;
  const transactionId = location.state?.transactionId;
  const bookingDetails = location.state?.bookingDetails || location.state?.membershipDetails;
  
  // Get email from props or user context
  const userEmail = email || user?.email || 'your email';

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      logger.warn('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const handleContinue = () => {
    if (fromPayment || fromCashPayment) {
      // Coming from payment (regular or cash) - go to dashboard
      navigate('/dashboard');
    } else {
      // Coming from registration - go to login
      navigate('/login', { 
        state: { 
          message: 'Please log in to access your new account.',
          fromRegistration: true
        }
      });
    }
  };


  return (
    <div className="main-container">
      {/* Success Icon */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '40px' 
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }}>
          <Check size={48} color="#ffffff" strokeWidth={3} />
        </div>
      </div>

      {/* Header Section */}
      <div className="header-section" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="main-title">
          {(fromPayment || fromCashPayment) ? 'Payment Successful' : 'Congratulations!'}
        </h1>
        <p className="main-subtitle">
          {(fromPayment || fromCashPayment) ? (
            <>
              {fromCashPayment ? 
                'Your cash payment has been collected! Your membership is now active! Welcome to ' : 
                'Your membership is now active! Welcome to '
              }
              <span className="semibold-email">Dnyanpeeth Abhyasika</span>
            </>
          ) : (
            <>
              Your account has been created successfully for <span className="semibold-email">{userEmail}</span>
            </>
          )}
        </p>
      </div>

      {/* Dyanpeeth ID Section (only for payment completion) */}
      {(fromPayment || fromCashPayment) && dyanpittId && (
        <div className="membership-details">
          <h3>Your Dyanpeeth ID</h3>
          <div className="detail-row">
            <span className="detail-label">Dyanpeeth ID</span>
            <span className="detail-value dyanpitt-id">{dyanpittId}</span>
          </div>
          {dyanpittId.startsWith('temp_') && (
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value" style={{ color: '#dc2626', fontSize: '12px' }}>
                Temporary - Permanent ID generating
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Details Section (only for payment completion) */}
      {(fromPayment || fromCashPayment) && bookingDetails && (
        <div className="membership-details">
          <h3>Payment Details</h3>
          
          <div className="detail-row">
            <span className="detail-label">Membership Type</span>
            <span className="detail-value">{bookingDetails.membershipType}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{bookingDetails.membershipDuration}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Time Slot</span>
            <span className="detail-value">{bookingDetails.timeSlot}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Start Date</span>
            <span className="detail-value">{formatDate(bookingDetails.membershipStartDate)}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">End Date</span>
            <span className="detail-value">{formatDate(bookingDetails.membershipEndDate)}</span>
          </div>
          
          {bookingDetails.preferredSeat && (
            <div className="detail-row">
              <span className="detail-label">Preferred Seat</span>
              <span className="detail-value">{bookingDetails.preferredSeat}</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-label">Amount Paid</span>
            <span className="detail-value">₹{bookingDetails.totalAmount}</span>
          </div>
          
          {transactionId && (
            <div className="detail-row">
              <span className="detail-label">Transaction ID</span>
              <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{transactionId}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div>
        <button 
          onClick={handleContinue}
          className="login-button"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {(fromPayment || fromCashPayment) ? (
            <>
              <ArrowRight size={16} style={{ marginRight: '8px' }} />
              Go to Dashboard
            </>
          ) : (
            'Continue to Login'
          )}
        </button>
      </div>
    </div>
  );
}