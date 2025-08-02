import React, { useEffect, useState } from 'react';
import apiService from '../services/api';

export default function DashboardScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user data from API
        const response = await apiService.getCurrentUser();
        if (response.success) {
          setUser(response.user);
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // If there's an error, redirect to login
        apiService.removeToken();
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle file change for profile picture
  const handleFileChange = async (e) => {
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
    
    try {
      // Upload avatar to server
      const response = await apiService.uploadAvatar(file);
      
      if (response.success) {
        // Update user state with new avatar URL
        setUser(response.user);
        console.log('Avatar uploaded successfully');
      } else {
        setErrors(prev => ({ ...prev, profilePicture: response.message || 'Failed to upload avatar' }));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setErrors(prev => ({ ...prev, profilePicture: error.message || 'Error uploading avatar. Please try again.' }));
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      window.location.href = '/';
    } catch {
      // Force logout even if API call fails
      apiService.removeToken();
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
            {user?.avatar ? (
              <img 
                src={`http://localhost:5000${user.avatar}`}
                alt="Profile" 
                className="dashboard-profile-image"
              />
            ) : (
              user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'
            )}
          </div>
        </div>
        <div className="header-text-section">
          <div className="welcome-message">Welcome!</div>
          <div className="user-name">{user?.fullName || 'User'}</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-welcome-section">
          <div className="dashboard-welcome-placeholder"></div>
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
                <div className="user-detail-item">
                  <span className="detail-label">Dyanpitt ID:</span>
                  {user.hasDnyanpittId ? (
                    <span className="detail-value dyanpitt-id">{user.dyanpittId}</span>
                  ) : (
                    <span className="detail-value pending-id">
                      Pending - Complete membership & payment to get your ID
                    </span>
                  )}
                </div>
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
                  {user?.avatar ? (
                    <img 
                      src={`http://localhost:5000${user.avatar}`}
                      alt="Current Profile" 
                      className="dashboard-current-profile-image"
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
                    {user?.avatar ? 'Change Picture' : 'Upload Profile Picture'}
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
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}