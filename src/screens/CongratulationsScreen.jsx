import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CongratulationsScreen({ userData, onContinue }) {
  const [copied, setCopied] = useState(false);

  // Use the Dyanpitt ID from userData (generated during registration)
  const dyanpittId = userData?.dyanpittId || '@DA202506001';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(dyanpittId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = dyanpittId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
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
          <h1 className="congratulations-title">Congratulations!</h1>
          <p className="congratulations-subtitle">
            Your account has been created successfully
          </p>
        </div>

        {/* Dyanpitt ID - Simple Display */}
        <div className="simple-id-section">
          <div className="simple-id-card">
            <div className="simple-id-display">
              <span className="simple-id-text">Your Dyanpitt ID <span className="simple-id-bold">{dyanpittId}</span></span>
              <button 
                onClick={copyToClipboard}
                className="simple-copy-button"
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <div className="simple-copy-success">
                Copied!
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <button 
          onClick={handleContinue}
          className="simple-continue-button"
        >
          Continue
        </button>
      </div>
    </div>
  );
}