import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Download, Phone, Calendar } from 'lucide-react';

export default function PaymentSuccessScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [confetti, setConfetti] = useState(true);

  const bookingData = location.state?.bookingData;
  const transactionId = location.state?.transactionId;

  useEffect(() => {
    // Remove confetti after 3 seconds
    const timer = setTimeout(() => setConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  const handleDownloadReceipt = () => {
    // Implement receipt download functionality
    // You can implement PDF generation here
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Confetti Animation */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="confetti">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Success Header */}
      <div className="header-section" style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '50%',
            margin: '0 auto',
            animation: 'bounce 1s infinite'
          }}>
            <CheckCircle size={60} color="#10b981" />
          </div>
        </div>
        
        <h1 className="main-title" style={{ color: '#10b981', marginBottom: '12px' }}>
          🎉 Payment Successful!
        </h1>
        
        <p className="main-subtitle" style={{ color: '#065f46', marginBottom: '8px' }}>
          Congratulations! Your cash payment has been successfully collected.
        </p>
        
        <p style={{ fontSize: '14px', color: '#059669', fontWeight: '500' }}>
          Your membership is now active and ready to use!
        </p>
      </div>

      {/* Transaction Details Card */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #dddddd', 
        borderRadius: '8px', 
        borderTop: '4px solid #10b981',
        padding: '20px', 
        marginBottom: '20px' 
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#000000', marginBottom: '12px' }}>
            Payment Confirmation
          </h2>
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #10b981', 
            borderRadius: '8px', 
            padding: '16px' 
          }}>
            <p style={{ fontSize: '14px', color: '#065f46', fontWeight: '600' }}>Transaction ID</p>
            <p style={{ 
              fontSize: '18px', 
              fontFamily: 'monospace', 
              fontWeight: '600', 
              color: '#000000', 
              marginTop: '4px' 
            }}>
              {transactionId || 'N/A'}
            </p>
          </div>
        </div>

        {/* Membership Details */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#000000'
          }}>
            <Calendar size={16} color="#5B5B5B" style={{ marginRight: '8px' }} />
            Your Membership Details
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500' }}>Membership Type</p>
              <p style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.membershipType}</p>
            </div>
            
            <div style={{ backgroundColor: '#f3e8ff', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#7c3aed', fontWeight: '500' }}>Duration</p>
              <p style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.membershipDuration}</p>
            </div>
            
            <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>Time Slot</p>
              <p style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{bookingData.timeSlot}</p>
            </div>
            
            <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#065f46', fontWeight: '500' }}>Amount Paid</p>
              <p style={{ fontSize: '16px', color: '#000000', fontWeight: '600' }}>₹{bookingData.totalAmount}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Start Date</p>
              <p style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{formatDate(bookingData.membershipStartDate)}</p>
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>End Date</p>
              <p style={{ fontSize: '14px', color: '#000000', fontWeight: '600' }}>{formatDate(bookingData.membershipEndDate)}</p>
            </div>
          </div>

          {bookingData.preferredSeat && (
            <div style={{ 
              backgroundColor: '#e0e7ff', 
              padding: '16px', 
              borderRadius: '8px', 
              textAlign: 'center' 
            }}>
              <p style={{ fontSize: '14px', color: '#3730a3', fontWeight: '500' }}>Your Preferred Seat</p>
              <p style={{ fontSize: '20px', color: '#000000', fontWeight: '600' }}>{bookingData.preferredSeat}</p>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps Card */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #dddddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px' 
      }}>
        <div style={{ 
          fontSize: '16px',
          fontWeight: '600',
          color: '#000000',
          marginBottom: '16px'
        }}>
          🚀 What's Next?
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px', 
            padding: '12px', 
            backgroundColor: '#dbeafe', 
            borderRadius: '8px' 
          }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px', 
              fontWeight: '600',
              flexShrink: 0
            }}>1</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>Access Your Dashboard</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>View your membership details and track your progress</p>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px', 
            padding: '12px', 
            backgroundColor: '#f0fdf4', 
            borderRadius: '8px' 
          }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              backgroundColor: '#10b981', 
              color: '#ffffff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px', 
              fontWeight: '600',
              flexShrink: 0
            }}>2</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>Visit the Center</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>Show your membership confirmation and start studying</p>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px', 
            padding: '12px', 
            backgroundColor: '#f3e8ff', 
            borderRadius: '8px' 
          }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              backgroundColor: '#8b5cf6', 
              color: '#ffffff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '12px', 
              fontWeight: '600',
              flexShrink: 0
            }}>3</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#000000' }}>Get Your Study Materials</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>Collect your study materials and seat assignment</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '20px', 
        textAlign: 'center' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          color: '#6b7280' 
        }}>
          <Phone size={16} />
          <span style={{ fontSize: '14px' }}>Need help? Contact us at +91 98765 43210</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          onClick={handleDownloadReceipt}
          className="login-button"
          style={{ 
            backgroundColor: '#3b82f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Download size={16} style={{ marginRight: '8px' }} />
          Download Receipt
        </button>
        
        <button 
          onClick={handleContinueToDashboard}
          className="login-button"
          style={{ 
            backgroundColor: '#10b981', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <ArrowRight size={16} style={{ marginRight: '8px' }} />
          Go to Dashboard
        </button>
      </div>

      <style jsx>{`
        .confetti {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #10b981;
          animation: confetti-fall 3s linear infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .success-icon-container {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 50%;
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}