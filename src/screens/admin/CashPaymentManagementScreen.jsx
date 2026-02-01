import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, CreditCard, Check, X } from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';

export default function CashPaymentManagementScreen() {
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      // Fetch pending cash bookings from the booking table
      const response = await apiService.request('/booking/pending-cash-payments');
      
      if (response.success) {
        setPendingPayments(response.pendingBookings || []);
      } else {
        logger.error('Failed to fetch pending payments:', response.message);
        alert('Failed to fetch pending payments: ' + response.message);
      }
    } catch (error) {
      logger.error('Error fetching pending payments:', error);
      alert('Error fetching pending payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = (payment) => {
    setSelectedPayment(payment);
    setAdminNotes('Payment collected in cash at center');
    setShowConfirmModal(true);
  };

  const confirmCashCollection = async () => {
    if (!selectedPayment) return;

    try {
      setProcessingPayment(selectedPayment.userId);
      // Confirm cash payment using the new booking-based system
      const response = await apiService.request('/booking/confirm-cash-payment', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedPayment.bookingId,
          userId: selectedPayment.userId,
          adminNotes: adminNotes
        })
      });
      
      if (response.success) {
        alert(response.message);
        // Remove the confirmed payment from the list
        setPendingPayments(prev => prev.filter(p => p.userId !== selectedPayment.userId));
        setShowConfirmModal(false);
        setSelectedPayment(null);
        setAdminNotes('');
      } else {
        alert('Failed to confirm payment: ' + response.message);
      }
    } catch (error) {
      logger.error('Error confirming payment:', error);
      alert('Error confirming payment. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading pending cash payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container admin-container">
      <button 
        onClick={() => navigate('/admin')}
        className="back-button"
      >
        <ArrowLeft size={20} color="white" />
      </button>

      <div className="header-section">
        <h1 className="main-title">Cash Payment Management</h1>
        <p className="main-subtitle">
          Manage pending cash payment collections ({pendingPayments.length} pending)
        </p>
      </div>

      <div className="admin-content">
        {pendingPayments.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={64} className="empty-icon" />
            <h3>No Pending Cash Payments</h3>
            <p>All cash payments have been collected or there are no pending requests.</p>
          </div>
        ) : (
          <div className="payments-grid">
            {pendingPayments.map((payment) => (
              <div key={payment.userId} className="payment-card">
                <div className="payment-header">
                  <div className="user-info">
                    {payment.avatar ? (
                      <img 
                        src={payment.avatar} 
                        alt={payment.fullName}
                        className="user-avatar"
                      />
                    ) : (
                      <div className="user-avatar-placeholder">
                        <User size={24} />
                      </div>
                    )}
                    <div className="user-details">
                      <h3 className="user-name">{payment.fullName}</h3>
                      <p className="user-email">{payment.email}</p>
                      <p className="user-phone">{payment.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="payment-amount">
                    <span className="amount">₹{payment.totalAmount}</span>
                    <span className="status-badge pending">Cash Pending</span>
                  </div>
                </div>

                <div className="payment-details">
                  <div className="detail-row">
                    <span className="detail-label">Membership:</span>
                    <span className="detail-value">{payment.membershipType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Time Slot:</span>
                    <span className="detail-value">{payment.timeSlot}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{payment.duration}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Start Date:</span>
                    <span className="detail-value">
                      {formatDate(payment.membershipStartDate)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Request Date:</span>
                    <span className="detail-value">
                      {formatDate(payment.requestDate)}
                    </span>
                  </div>
                </div>

                <div className="payment-actions">
                  <button
                    onClick={() => handleConfirmPayment(payment)}
                    disabled={processingPayment === payment.userId}
                    className="confirm-button"
                  >
                    {processingPayment === payment.userId ? (
                      <>
                        <div className="button-spinner"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Confirm Payment Collected
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Cash Payment Collection</h2>
              <button 
                className="modal-close"
                onClick={() => setShowConfirmModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="confirmation-details">
                <h3>Payment Details</h3>
                <div className="detail-row">
                  <span>User:</span>
                  <span>{selectedPayment.fullName}</span>
                </div>
                <div className="detail-row">
                  <span>Email:</span>
                  <span>{selectedPayment.email}</span>
                </div>
                <div className="detail-row">
                  <span>Amount:</span>
                  <span>₹{selectedPayment.totalAmount}</span>
                </div>
                <div className="detail-row">
                  <span>Membership:</span>
                  <span>{selectedPayment.membershipType}</span>
                </div>
              </div>

              <div className="admin-notes-section">
                <label className="input-label">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about the payment collection..."
                  className="admin-notes-input"
                  rows="3"
                />
              </div>

              <div className="confirmation-warning">
                <p>⚠️ This action will:</p>
                <ul>
                  <li>Mark the payment as collected</li>
                  <li>Generate and send the user's Dyanpitt ID</li>
                  <li>Allow the user to login to their account</li>
                  <li>Send a welcome email with their Dyanpitt ID</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={confirmCashCollection}
                disabled={processingPayment === selectedPayment.userId}
                className="confirm-button primary"
              >
                {processingPayment === selectedPayment.userId ? (
                  <>
                    <div className="button-spinner"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm Collection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}