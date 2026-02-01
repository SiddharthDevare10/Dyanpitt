import { useState, useEffect } from 'react';

const AutoSaveIndicator = ({ 
  isVisible = false, 
  saveTime = null, 
  status = 'saved', // 'saving', 'saved', 'error'
  onRestore = null,
  showRestoreOption = false 
}) => {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowIndicator(true);
      
      // Auto-hide after 3 seconds for 'saved' status
      if (status === 'saved') {
        const timer = setTimeout(() => {
          setShowIndicator(false);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    } else {
      setShowIndicator(false);
    }
  }, [isVisible, status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return (
          <svg className="autosave-icon saving" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="32">
              <animate attributeName="stroke-dashoffset" dur="1s" values="32;0;32" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
      case 'saved':
        return (
          <svg className="autosave-icon saved" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="autosave-icon error" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return saveTime ? `Saved at ${saveTime.toLocaleTimeString()}` : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  const formatRestoreTime = (time) => {
    const now = new Date();
    const diffMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return time.toLocaleDateString();
  };

  if (!showIndicator && !showRestoreOption) return null;

  return (
    <>
      {/* Auto-save Status Indicator */}
      {showIndicator && (
        <div className={`autosave-indicator ${status}`}>
          {getStatusIcon()}
          <span className="autosave-text">{getStatusText()}</span>
        </div>
      )}

      {/* Restore Option */}
      {showRestoreOption && saveTime && onRestore && (
        <div className="autosave-restore-banner">
          <div className="restore-content">
            <div className="restore-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </div>
            <div className="restore-text">
              <span className="restore-main">Restore unsaved changes?</span>
              <span className="restore-time">Last saved {formatRestoreTime(saveTime)}</span>
            </div>
          </div>
          <div className="restore-actions">
            <button 
              className="restore-btn restore"
              onClick={onRestore}
            >
              Restore
            </button>
            <button 
              className="restore-btn dismiss"
              onClick={() => {/* This should clear the saved data */}}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .autosave-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .autosave-indicator.saving {
          border-color: #3b82f6;
        }

        .autosave-indicator.saved {
          border-color: #10b981;
        }

        .autosave-indicator.error {
          border-color: #ef4444;
        }

        .autosave-icon.saving {
          color: #3b82f6;
        }

        .autosave-icon.saved {
          color: #10b981;
        }

        .autosave-icon.error {
          color: #ef4444;
        }

        .autosave-text {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }

        .autosave-restore-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #fef3c7;
          border-bottom: 1px solid #f59e0b;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1001;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .restore-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .restore-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .restore-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .restore-main {
          font-weight: 600;
          color: #92400e;
          font-size: 14px;
        }

        .restore-time {
          font-size: 12px;
          color: #b45309;
        }

        .restore-actions {
          display: flex;
          gap: 8px;
        }

        .restore-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .restore-btn.restore {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }

        .restore-btn.restore:hover {
          background: #d97706;
          border-color: #d97706;
        }

        .restore-btn.dismiss {
          background: white;
          color: #92400e;
          border-color: #f59e0b;
        }

        .restore-btn.dismiss:hover {
          background: #fef3c7;
        }

        @media (max-width: 640px) {
          .autosave-indicator {
            top: 10px;
            right: 10px;
            left: 10px;
            justify-content: center;
          }

          .autosave-restore-banner {
            padding: 10px 16px;
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .restore-content {
            justify-content: center;
          }

          .restore-actions {
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
};

export default AutoSaveIndicator;