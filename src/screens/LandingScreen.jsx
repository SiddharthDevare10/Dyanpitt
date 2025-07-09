import React from 'react';

const LandingScreen = ({ onNavigateToLogin, onNavigateToRegister, onNavigateToTour }) => {
  const handleTour = () => {
    onNavigateToTour();
  };

  const handleSignIn = () => {
    onNavigateToLogin();
  };

  const handleSignUp = () => {
    onNavigateToRegister();
  };

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <h1 className="landing-title">Welcome to Dyanpitt</h1>
          <p className="landing-subtitle">Your journey starts here</p>
        </div>
        
        <div className="landing-buttons">
          <button 
            className="landing-button tour-button"
            onClick={handleTour}
          >
            Tour
          </button>
          
          <button 
            className="landing-button landing-signin-button"
            onClick={handleSignIn}
          >
            Sign In
          </button>
          
          <button 
            className="landing-button landing-signup-button"
            onClick={handleSignUp}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;