import React, { useEffect, useState } from 'react';
import apiService from '../services/api';

export default function DashboardScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Try to get user data from localStorage first (for demo)
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('Dashboard user data:', parsedUser); // Debug log
          console.log('Profile picture in data:', parsedUser.profilePicture);
          console.log('All user data keys:', Object.keys(parsedUser));
          setUser(parsedUser);
        } else {
          // In production, fetch from API
          const response = await apiService.getCurrentUser();
          setUser(response.user);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // If there's an error, redirect to login
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle file change for profile picture
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profilePicture: 'Please select a valid image file' }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, profilePicture: 'File size must be less than 5MB' }));
      return;
    }
    
    // Clear errors
    setErrors(prev => ({ ...prev, profilePicture: '' }));
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      
      // Update user data with new profile picture
      const updatedUser = { ...user, profilePicture: base64Data };
      setUser(updatedUser);
      
      // Save to localStorage
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      localStorage.setItem('registrationProfilePicture', base64Data);
      
      console.log('Profile picture updated successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      localStorage.removeItem('userData');
      window.location.href = '/';
    } catch {
      // Force logout even if API call fails
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="profile-picture-container">
          <div className="profile-picture">
            {(() => {
              console.log('Profile picture check:', user?.profilePicture ? 'Has image' : 'No image');
              console.log('User full name:', user?.fullName);
              return user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '20px'
                  }}
                />
              ) : (
                user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'
              );
            })()}
          </div>
        </div>
        <div className="header-text-section">
          <div className="welcome-message">Welcome !</div>
          <div className="user-name">{user?.fullName || 'User'}</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-welcome-section">
          <h2 className="dashboard-subtitle">Welcome to your Dashboard!</h2>
          <p className="dashboard-description">
            You have successfully logged in to your Dyanpitt account.
          </p>

          {user && (
            <div className="dashboard-user-card">
              <h3 className="user-card-title">Your Account Details</h3>
              <div className="user-details">
                <div className="user-detail-item">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{user.fullName}</span>
                </div>
                <div className="user-detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user.email}</span>
                </div>
                {user.dyanpittId && (
                  <div className="user-detail-item">
                    <span className="detail-label">Dyanpitt ID:</span>
                    <span className="detail-value dyanpitt-id">{user.dyanpittId}</span>
                  </div>
                )}
                {user.phoneNumber && (
                  <div className="user-detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{user.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Picture Upload Section */}
          <div className="dashboard-profile-section">
            <h3 className="section-title">Profile Picture</h3>
            <div className="profile-upload-container">
              <div className="current-profile-display">
                <div className="dashboard-profile-picture">
                  {user?.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt="Current Profile" 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '20px'
                      }}
                    />
                  ) : (
                    user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
              </div>
              
              <div className="profile-upload-controls">
                <div className="file-upload-container">
                  <input
                    type="file"
                    name="profilePicture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                    id="dashboardProfilePicture"
                  />
                  <label 
                    htmlFor="dashboardProfilePicture" 
                    className={`file-upload-button ${errors.profilePicture ? 'input-error' : ''}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    {user?.profilePicture ? 'Change Picture' : 'Upload Profile Picture'}
                  </label>
                </div>
                {errors.profilePicture && <span className="error-message">{errors.profilePicture}</span>}
              </div>
            </div>
          </div>

          <div className="dashboard-placeholder">
            <p>This is a placeholder dashboard page.</p>
            <p>More features will be added here in the future.</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-footer">
        <button onClick={() => {
          // Get profile picture from registration page
          const registrationData = localStorage.getItem('registrationProfilePicture');
          if (registrationData) {
            const updatedUser = { ...user, profilePicture: registrationData };
            setUser(updatedUser);
            localStorage.setItem('userData', JSON.stringify(updatedUser));
            console.log('Profile picture updated from registration data');
          } else {
            console.log('No registration profile picture found');
          }
        }} className="logout-button" style={{marginBottom: '10px'}}>
          Load Profile Picture
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}