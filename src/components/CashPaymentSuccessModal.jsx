import { CheckCircle, X } from 'lucide-react';

export default function CashPaymentSuccessModal({ isOpen, onClose, onContinue, transactionId }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cash-payment-success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="success-icon">
            <CheckCircle size={48} color="#22c55e" />
          </div>
          
          <h2 className="modal-title">Cash Payment Request Submitted!</h2>
          
          <div className="transaction-id-section">
            <div className="transaction-id-card">
              <span className="transaction-label">Transaction ID</span>
              <span className="transaction-value">{transactionId}</span>
            </div>
          </div>
          
          <p className="modal-message">
            You need to submit the cash to the respective admin and you will receive your Dyanpitt ID after payment collection.
          </p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="login-button login-screen-submit-button"
            onClick={onContinue}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}