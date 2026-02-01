import { useEffect } from 'react';

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  type = 'info', 
  title, 
  message, 
  actions = [], 
  autoClose = false,
  autoCloseDelay = 3000 
}) => {
  useEffect(() => {
    if (autoClose && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="notification-icon success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="notification-icon error" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      case 'warning':
        return (
          <svg className="notification-icon warning" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        );
      default:
        return (
          <svg className="notification-icon info" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        );
    }
  };

  return (
    <div className="notification-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          {getIcon()}
          <div className="notification-title-section">
            {title && <h3 className="notification-title">{title}</h3>}
            <button 
              className="notification-close"
              onClick={onClose}
              aria-label="Close notification"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        
        {message && (
          <div className="notification-body">
            <p className="notification-message">{message}</p>
          </div>
        )}
        
        {actions.length > 0 && (
          <div className="notification-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`notification-btn ${action.variant || 'secondary'}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx="true">{`
        .notification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .notification-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalSlideIn 0.2s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .notification-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 20px 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .notification-title-section {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .notification-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-icon.success {
          color: #10b981;
        }

        .notification-icon.error {
          color: #ef4444;
        }

        .notification-icon.warning {
          color: #f59e0b;
        }

        .notification-icon.info {
          color: #3b82f6;
        }

        .notification-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
        }

        .notification-close {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #6b7280;
          border-radius: 6px;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .notification-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .notification-body {
          padding: 0 20px 20px 20px;
        }

        .notification-message {
          margin: 0;
          color: #374151;
          line-height: 1.5;
          font-size: 14px;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 16px 20px 20px 20px;
          border-top: 1px solid #e5e7eb;
        }

        .notification-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .notification-btn.primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .notification-btn.primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .notification-btn.secondary {
          background: #f9fafb;
          color: #374151;
          border-color: #d1d5db;
        }

        .notification-btn.secondary:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .notification-btn.danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .notification-btn.danger:hover {
          background: #dc2626;
          border-color: #dc2626;
        }

        @media (max-width: 640px) {
          .notification-overlay {
            padding: 16px;
          }

          .notification-modal {
            max-width: 100%;
          }

          .notification-header {
            padding: 16px 16px 12px 16px;
          }

          .notification-body {
            padding: 0 16px 16px 16px;
          }

          .notification-actions {
            padding: 12px 16px 16px 16px;
            flex-direction: column;
          }

          .notification-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationModal;