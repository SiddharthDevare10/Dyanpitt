import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import logger from '../../utils/logger';

const AdminDashboardScreen = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Logout error:', error);
      // Force navigation even if logout fails
      navigate('/login');
    }
  };
  return (
    <div className="main-container admin-dashboard-container admin-page">
      <div className="header-section">
        <div className="header-content">
          <div className="header-text">
            <h1 className="main-title">Admin Dashboard</h1>
            <p className="main-subtitle">Manage users, bookings, and system settings</p>
          </div>
          <div className="header-actions">
            <div className="admin-info">
              <span className="admin-name">Welcome, {user?.firstName || 'Admin'}</span>
              <span className="admin-role">{user?.role || 'admin'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="logout-button"
              title="Logout"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-content">
        <div className="admin-stats-grid responsive admin-card">
          <div className="admin-stat-card">
            <h3>Total Users</h3>
            <p className="stat-number">0</p>
          </div>
          
          <div className="admin-stat-card">
            <h3>Active Bookings</h3>
            <p className="stat-number">0</p>
          </div>
          
          <div className="admin-stat-card">
            <h3>Tour Requests</h3>
            <p className="stat-number">0</p>
          </div>
          
          <div className="admin-stat-card">
            <h3>Revenue</h3>
            <p className="stat-number">$0</p>
          </div>
        </div>

        <div className="admin-actions">
          <button 
            className="admin-action-button"
            onClick={() => navigate('/user-management')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Manage Users
          </button>
          
          <button 
            className="admin-action-button"
            onClick={() => navigate('/admin/tour-management')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Tour Management
          </button>
          
          <button 
            className="admin-action-button cash-payment-action"
            onClick={() => navigate('/admin/cash-payments')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 12H6.01M18 12H18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Cash Payments
          </button>
          
          <button 
            className="admin-action-button qr-scanner-action"
            onClick={() => navigate('/admin/qr-scanner')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
              <rect x="16" y="3" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="16" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 16H16V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 21L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            QR Scanner
          </button>
          
          <button className="admin-action-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Manage Bookings
          </button>
          
          <button className="admin-action-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M19.4 15A1.65 1.65 0 0 0 20.25 13.38L20.25 10.62A1.65 1.65 0 0 0 19.4 9L18.75 8.74A7.26 7.26 0 0 0 17.39 6.26L17.65 5.6A1.65 1.65 0 0 0 16.27 3.73L13.73 4.27A1.65 1.65 0 0 0 12 3.25A1.65 1.65 0 0 0 10.27 4.27L7.73 3.73A1.65 1.65 0 0 0 6.35 5.6L6.61 6.26A7.26 7.26 0 0 0 5.25 8.74L4.6 9A1.65 1.65 0 0 0 3.75 10.62V13.38A1.65 1.65 0 0 0 4.6 15L5.25 15.26A7.26 7.26 0 0 0 6.61 17.74L6.35 18.4A1.65 1.65 0 0 0 7.73 20.27L10.27 19.73A1.65 1.65 0 0 0 12 20.75A1.65 1.65 0 0 0 13.73 19.73L16.27 20.27A1.65 1.65 0 0 0 17.65 18.4L17.39 17.74A7.26 7.26 0 0 0 18.75 15.26L19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;