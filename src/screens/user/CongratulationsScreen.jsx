import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function CongratulationsScreen({ email }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get email from props or user context
  const userEmail = email || user?.email || 'your email';

  const handleContinue = () => {
    navigate('/login');
  };

  const handleExit = () => {
    navigate('/');
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
            Your account has been created successfully <span className="email-highlight">{userEmail}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="congratulations-buttons">
          <button 
            onClick={handleExit}
            className="login-button secondary-button"
          >
            Exit
          </button>
          <button 
            onClick={handleContinue}
            className="login-button"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}