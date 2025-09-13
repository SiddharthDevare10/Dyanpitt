import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UserManagementScreen = () => {
  const navigate = useNavigate();
  const [users] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="main-container user-management-container">
      {/* Back Button */}
      <button onClick={() => navigate('/admin-dashboard')} className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="header-section">
        <h1 className="main-title">User Management</h1>
        <p className="main-subtitle">Manage registered users and their accounts</p>
      </div>

      <div className="user-management-content">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search users by name, email, or Dyanpitt ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="users-list">
          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <p>{user.dyanpittId}</p>
                </div>
                <div className="user-actions">
                  <button className="action-button view">View</button>
                  <button className="action-button edit">Edit</button>
                  <button className="action-button delete">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementScreen;