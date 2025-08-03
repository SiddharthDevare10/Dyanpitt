import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboardScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="main-container admin-dashboard-container">
      <div className="header-section">
        <h1 className="main-title">Admin Dashboard</h1>
        <p className="main-subtitle">Manage users, bookings, and system settings</p>
      </div>

      <div className="admin-dashboard-content">
        <div className="admin-stats-grid">
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
            Manage Users
          </button>
          
          <button className="admin-action-button">
            Manage Bookings
          </button>
          
          <button className="admin-action-button">
            View Tour Requests
          </button>
          
          <button className="admin-action-button">
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;