import { useEffect, useState } from 'react';
import apiService from '../../services/api';
import QRCode from 'qrcode';

// Get the API base URL for avatar images
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const AVATAR_BASE_URL = API_BASE_URL.replace('/api', '');

export default function DashboardScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [avatarError, setAvatarError] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

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

  // Handle avatar image load error
  const handleAvatarError = () => {
    setAvatarError(true);
  };

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  // Generate QR code when user data is available
  useEffect(() => {
    if (user && user.bookingDetails && user.bookingDetails.paymentStatus === 'completed') {
      generateQRCode(user);
    }
  }, [user?.bookingDetails?.paymentStatus, user?.dyanpittId, user?.fullName]);

  const generateQRCode = async (userData) => {
    try {
      // Create QR code data with membership details (similar to tour page format)
      const qrData = {
        type: 'MEMBERSHIP_PASS',
        id: userData.dyanpittId || userData.email,
        name: userData.fullName,
        email: userData.email,
        membership: userData.bookingDetails.membershipType,
        timeSlot: userData.bookingDetails.timeSlot,
        validFrom: userData.bookingDetails.membershipStartDate,
        validUntil: userData.bookingDetails.membershipEndDate,
        seat: userData.bookingDetails.preferredSeat || 'Any',
        generatedAt: new Date().toISOString(),
        status: 'active'
      };

      // Generate QR code as data URL using same options as tour page
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownloadPass = async () => {
    if (!qrCodeDataUrl || !user) return;

    try {
      // Create a canvas for the detailed pass
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (similar to tour page)
      canvas.width = 800;
      canvas.height = 1200;
      
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Header
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('DYANPITT MEMBERSHIP PASS', canvas.width / 2, 60);
      
      // Subtitle
      ctx.font = '18px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Study Room Access Pass', canvas.width / 2, 90);
      
      let yPos = 150;
      
      // Member Information
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Member Information', 50, yPos);
      yPos += 40;
      
      ctx.font = '16px Arial';
      ctx.fillStyle = '#374151';
      
      // Member details
      const memberInfo = [
        `Name: ${user.fullName}`,
        `Email: ${user.email}`,
        ...(user.dyanpittId ? [`Dyanpeeth Abhyasika ID: ${user.dyanpittId}`] : []),
        ...(user.phoneNumber ? [`Phone: ${user.phoneNumber}`] : [])
      ];
      
      memberInfo.forEach(info => {
        ctx.fillText(info, 50, yPos);
        yPos += 25;
      });
      
      yPos += 20;
      
      // Membership Details
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Membership Details', 50, yPos);
      yPos += 40;
      
      ctx.font = '16px Arial';
      ctx.fillStyle = '#374151';
      
      const membershipInfo = [
        `Type: ${user.bookingDetails.membershipType}`,
        `Duration: ${user.bookingDetails.membershipDuration}`,
        `Time Slot: ${user.bookingDetails.timeSlot}`,
        `Valid From: ${new Date(user.bookingDetails.membershipStartDate).toLocaleDateString()}`,
        `Valid Until: ${new Date(user.bookingDetails.membershipEndDate).toLocaleDateString()}`,
        ...(user.bookingDetails.preferredSeat ? [`Preferred Seat: ${user.bookingDetails.preferredSeat}`] : []),
        `Amount Paid: ₹${user.bookingDetails.totalAmount}`
      ];
      
      membershipInfo.forEach(info => {
        ctx.fillText(info, 50, yPos);
        yPos += 25;
      });
      
      yPos += 40;
      
      // QR Code section
      const qrImg = new Image();
      qrImg.onload = () => {
        // QR Code - centered
        const qrSize = 200;
        const qrX = (canvas.width - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, yPos, qrSize, qrSize);
        
        // QR Code label
        yPos += qrSize + 30;
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Scan for Verification', canvas.width / 2, yPos);
        
        yPos += 40;
        
        // Instructions
        ctx.font = '14px Arial';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Present this pass at the entrance for access', canvas.width / 2, yPos);
        yPos += 20;
        ctx.fillText('Show QR code to staff for verification', canvas.width / 2, yPos);
        
        // Footer
        yPos += 60;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Arial';
        ctx.fillText(`Generated on: ${new Date().toLocaleString()}`, canvas.width / 2, yPos);
        
        // Download the image
        const link = document.createElement('a');
        link.download = `dyanpitt-membership-pass-${user.dyanpittId || user.email}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      
      qrImg.src = qrCodeDataUrl;
      
    } catch (error) {
      console.error('Error generating membership pass:', error);
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
        <div className="simple-loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="profile-picture-container">
          <div className="profile-picture">
            {user?.avatar && !avatarError ? (
              <img 
                src={`${AVATAR_BASE_URL}${user.avatar}`}
                alt="Profile" 
                className="dashboard-profile-image"
                onError={handleAvatarError}
                crossOrigin="anonymous"
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
                  <span className="detail-label">Dyanpeeth Abhyasika ID:</span>
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

          {/* Membership Status Section */}
          {user && (
            <div className="dashboard-membership-section">
              <h3 className="section-title">Membership Status</h3>
              <div className="membership-status-card">
                {user.bookingDetails && user.bookingDetails.paymentStatus === 'completed' ? (
                  <div className="active-membership">
                    <div className="membership-header">
                      <div className="status-indicator active">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/>
                          <circle cx="12" cy="12" r="9"/>
                        </svg>
                        <span>Active Membership</span>
                      </div>
                      <div className="membership-type">{user.bookingDetails.membershipType}</div>
                    </div>
                    
                    <div className="membership-details">
                      <div className="detail-row">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{user.bookingDetails.membershipDuration}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Time Slot:</span>
                        <span className="detail-value">{user.bookingDetails.timeSlot}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Start Date:</span>
                        <span className="detail-value">
                          {new Date(user.bookingDetails.membershipStartDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">End Date:</span>
                        <span className="detail-value">
                          {new Date(user.bookingDetails.membershipEndDate).toLocaleDateString()}
                        </span>
                      </div>
                      {user.bookingDetails.preferredSeat && (
                        <div className="detail-row">
                          <span className="detail-label">Preferred Seat:</span>
                          <span className="detail-value">{user.bookingDetails.preferredSeat}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">Amount Paid:</span>
                        <span className="detail-value">₹{user.bookingDetails.totalAmount}</span>
                      </div>
                    </div>

                    {/* Check if membership is expired or expiring soon */}
                    {(() => {
                      const endDate = new Date(user.bookingDetails.membershipEndDate);
                      const today = new Date();
                      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                      
                      // Log membership status for debugging
                      console.log('Membership Status Check:', {
                        endDate: endDate.toLocaleDateString(),
                        today: today.toLocaleDateString(),
                        daysUntilExpiry,
                        paymentStatus: user.bookingDetails.paymentStatus
                      });
                      
                      if (daysUntilExpiry <= 0) {
                        return (
                          <div className="membership-action expired">
                            <div className="expiry-notice">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                              Your membership has expired
                            </div>
                            <button 
                              className="renew-button"
                              onClick={() => window.location.href = '/booking?renewal=true'}
                            >
                              Renew Membership
                            </button>
                          </div>
                        );
                      } else if (daysUntilExpiry <= 7) {
                        return (
                          <div className="membership-action expiring">
                            <div className="expiry-notice">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                              Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                            </div>
                            <button 
                              className="renew-button"
                              onClick={() => window.location.href = '/booking?renewal=true'}
                            >
                              Renew Membership
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="membership-action active">
                            <div className="expiry-info">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4"/>
                                <circle cx="12" cy="12" r="9"/>
                              </svg>
                              {daysUntilExpiry} days remaining
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : user.bookingDetails && user.bookingDetails.paymentStatus === 'pending' ? (
                  <div className="pending-membership">
                    <div className="status-indicator pending">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>Payment Pending</span>
                    </div>
                    <p className="membership-message">
                      Your membership booking is pending payment completion.
                    </p>
                    <button 
                      className="complete-payment-button"
                      onClick={() => window.location.href = '/payment'}
                    >
                      Complete Payment
                    </button>
                  </div>
                ) : (
                  <div className="no-membership">
                    <div className="status-indicator inactive">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span>No Active Membership</span>
                    </div>
                    <p className="membership-message">
                      You don't have an active membership yet. Get started by purchasing a membership plan.
                    </p>
                    <button 
                      className="get-membership-button"
                      onClick={() => {
                        if (user.membershipCompleted) {
                          window.location.href = '/booking';
                        } else {
                          window.location.href = '/membership-details';
                        }
                      }}
                    >
                      {user.membershipCompleted ? 'Purchase Membership' : 'Complete Profile & Get Membership'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Code Section */}
          {user && user.bookingDetails && user.bookingDetails.paymentStatus === 'completed' && (
            <div className="qr-container">
              <div className="qr-left-side">
                <div className="scan-me-text">
                  <h4>Scan Me</h4>
                  <p>Show this QR code at the entrance for quick access to your study room.</p>
                </div>
                <button 
                  className="download-qr-button"
                  onClick={handleDownloadPass}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download QR Pass
                </button>
              </div>
              <div className="qr-right-side">
                <div className="qr-code-display">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Membership Pass QR Code" 
                      className="qr-code-image"
                      style={{ width: '200px', height: '200px', border: '2px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: '200px', 
                        height: '200px', 
                        border: '2px solid #e2e8f0', 
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8fafc',
                        color: '#64748b'
                      }}
                    >
                      Generating QR Code...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Picture Upload Section */}
          <div className="dashboard-profile-section">
            <h3 className="section-title">Profile Picture</h3>
            <div className="profile-upload-container">
              <div className="current-profile-display">
                <div className="dashboard-profile-picture">
                  {user?.avatar && !avatarError ? (
                    <img 
                      src={`${AVATAR_BASE_URL}${user.avatar}`}
                      alt="Current Profile" 
                      className="dashboard-current-profile-image"
                      onError={handleAvatarError}
                      crossOrigin="anonymous"
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