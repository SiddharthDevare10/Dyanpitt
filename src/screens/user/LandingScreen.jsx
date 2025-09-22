import { useNavigate } from 'react-router-dom';

const LandingScreen = () => {
  const navigate = useNavigate();

  const handleTour = () => {
    navigate('/tour');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/register');
  };

  return (
    <div className="landing-container">
      {/* Background decorative elements */}
      <div className="landing-bg-decoration"></div>
      <div className="landing-bg-gradient"></div>
      
      {/* Top centered logo */}
      <div className="landing-logo">
        <img src="./Logo.png" alt="Dyanpeeth Abhyasika Logo" className="logo-image" />
      </div>
      
      <div className="landing-content">
        {/* Left side - Hero Content */}
        <div className="landing-hero">
          <div className="landing-badge">
            <span className="landing-badge-dot"></span>
            <span className="landing-badge-text">Your Success Starts Here</span>
          </div>
          
          <div className="landing-header">
            <h1 className="landing-title">
              Welcome to <span className="landing-title-highlight">Dyanpeeth Abhyasika</span>
            </h1>
            <p className="landing-subtitle">
              Premium study rooms designed for competitive exam aspirants. 
              Book a facility tour to explore our world-class study environment and amenities.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="landing-features">
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  <path d="M8 6h8"/>
                  <path d="M8 10h8"/>
                  <path d="M8 14h5"/>
                </svg>
              </div>
              <span>Focused Study Environment</span>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
              <span>Modern Facilities</span>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <span>Community of Achievers</span>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                </svg>
              </div>
              <span>24/7 Access</span>
            </div>
          </div>
        </div>
        
        {/* Right side - CTA Section */}
        <div className="landing-cta-section">
          <h2 className="landing-cta-title">Ready to Begin Your Journey?</h2>
          <p className="landing-cta-subtitle">
            Join thousands of successful students who have achieved their dreams with our premium study facilities.
          </p>
          
          {/* CTA Buttons */}
          <div className="landing-buttons">
            <button 
              className="landing-button landing-primary-button"
              onClick={handleTour}
            >
              <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              Request a Tour
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
              Create Account
            </button>
          </div>

          {/* Trust indicators */}
          <div className="landing-trust">
            <p className="landing-trust-text">Trusted by thousands of competitive exam aspirants</p>
            <div className="landing-stats">
              <div className="landing-stat">
                <span className="landing-stat-number">2000+</span>
                <span className="landing-stat-label">Students Enrolled</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-number">500+</span>
                <span className="landing-stat-label">Facility Tours</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-number">95%</span>
                <span className="landing-stat-label">Success Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;