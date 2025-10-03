import { useState, useEffect } from 'react';
import networkFailureHandler from '../utils/networkFailureHandler';

const NetworkStatusIndicator = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    queuedRequests: 0,
    showIndicator: false
  });

  useEffect(() => {
    const handleNetworkChange = (status) => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: status === 'online',
        showIndicator: true
      }));

      // Auto-hide indicator after 3 seconds if online
      if (status === 'online') {
        setTimeout(() => {
          setNetworkStatus(prev => ({ ...prev, showIndicator: false }));
        }, 3000);
      }
    };

    const handleRequestQueued = (status, data) => {
      if (status === 'request_queued') {
        setNetworkStatus(prev => ({
          ...prev,
          queuedRequests: prev.queuedRequests + 1,
          showIndicator: true
        }));
      }
    };

    networkFailureHandler.addListener(handleNetworkChange);
    networkFailureHandler.addListener(handleRequestQueued);

    return () => {
      networkFailureHandler.removeListener(handleNetworkChange);
      networkFailureHandler.removeListener(handleRequestQueued);
    };
  }, []);

  const handleRetryRequests = async () => {
    await networkFailureHandler.retryFailedRequests();
    setNetworkStatus(prev => ({ ...prev, queuedRequests: 0 }));
  };

  if (!networkStatus.showIndicator) return null;

  return (
    <div className={`network-indicator ${networkStatus.isOnline ? 'online' : 'offline'}`}>
      <div className="network-content">
        <div className="network-icon">
          {networkStatus.isOnline ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          )}
        </div>
        <div className="network-text">
          {networkStatus.isOnline ? (
            <span>Back online</span>
          ) : (
            <span>You're offline</span>
          )}
          {networkStatus.queuedRequests > 0 && (
            <span className="queued-count">
              {networkStatus.queuedRequests} request{networkStatus.queuedRequests !== 1 ? 's' : ''} queued
            </span>
          )}
        </div>
      </div>
      
      {!networkStatus.isOnline && networkStatus.queuedRequests > 0 && (
        <button 
          className="retry-button"
          onClick={handleRetryRequests}
          disabled={!networkStatus.isOnline}
        >
          Retry when online
        </button>
      )}

      <style jsx>{`
        .network-indicator {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 1000;
          animation: slideDown 0.3s ease-out;
          min-width: 200px;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .network-indicator.online {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .network-indicator.offline {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .network-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .network-icon {
          flex-shrink: 0;
        }

        .network-indicator.online .network-icon {
          color: #10b981;
        }

        .network-indicator.offline .network-icon {
          color: #ef4444;
        }

        .network-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .network-text span:first-child {
          font-weight: 600;
          font-size: 14px;
        }

        .network-indicator.online .network-text span:first-child {
          color: #065f46;
        }

        .network-indicator.offline .network-text span:first-child {
          color: #991b1b;
        }

        .queued-count {
          font-size: 12px;
          color: #6b7280;
        }

        .retry-button {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .retry-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .retry-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .network-indicator {
            left: 16px;
            right: 16px;
            transform: none;
            flex-direction: column;
            gap: 8px;
          }

          .retry-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default NetworkStatusIndicator;