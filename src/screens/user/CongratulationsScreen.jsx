import { Copy, Check, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function CongratulationsScreen({ email }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Check if coming from payment completion
  const fromPayment = location.state?.fromPayment;
  const dyanpittId = location.state?.dyanpittId || user?.dyanpittId;
  const transactionId = location.state?.transactionId;
  
  // Get email from props or user context
  const userEmail = email || user?.email || 'your email';

  const handleContinue = () => {
    if (fromPayment) {
      // Coming from payment - go to dashboard
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
    <div className="congratulations-container">
      <div className="congratulations-content">
        {/* Success Icon */}
        <div className="success-icon">
          <div className="success-circle">
            <Check size={48} color="#ffffff" />
          </div>
        </div>

        {/* Congratulations Message */}
        <div className="congratulations-header">
          <h1 className="congratulations-title">
            {fromPayment ? '🎉 Payment Successful!' : 'Congratulations!'}
          </h1>
          <p className="congratulations-subtitle">
            {fromPayment ? (
              <>
                Your membership is now active! <br/>
                Welcome to <span className="email-highlight">Dnyanpeeth Abhyasika</span>
              </>
            ) : (
              <>
                Your account has been created successfully for <span className="email-highlight">{userEmail}</span>
              </>
            )}
          </p>
        </div>

        {/* Dyanpeeth ID Display (only for payment completion) */}
        {fromPayment && dyanpittId && (
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            border: '2px solid #10b981', 
            borderRadius: '12px', 
            padding: '20px', 
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '600', marginBottom: '8px' }}>
              🆔 Your Dyanpeeth ID
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontFamily: 'monospace', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '2px',
              marginBottom: '8px'
            }}>
              {dyanpittId}
            </div>
            <div style={{ fontSize: '12px', color: '#065f46' }}>
              Use this ID for all future references
            </div>
          </div>
        )}

        {/* Transaction ID (only for payment completion) */}
        {fromPayment && transactionId && (
          <div style={{ 
            backgroundColor: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px', 
            padding: '16px', 
            marginTop: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Transaction ID
            </div>
            <div style={{ 
              fontSize: '14px', 
              fontFamily: 'monospace', 
              color: '#000000', 
              fontWeight: '600'
            }}>
              {transactionId}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="congratulations-buttons">
          <button 
            onClick={handleContinue}
            className="login-button"
            style={{
              backgroundColor: fromPayment ? '#10b981' : '#5B5B5B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {fromPayment ? (
              <>
                <ArrowRight size={16} />
                Go to Dashboard
              </>
            ) : (
              'Continue to Login'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}