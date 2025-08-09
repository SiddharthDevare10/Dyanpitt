import { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function TourManagementScreen() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const result = await apiService.request('/tour/requests');
      setTours(result.data || []);
    } catch (error) {
      console.error('Error fetching tours:', error);
      setError('Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  const updateTourStatus = async (tourId, newStatus) => {
    try {
      const result = await apiService.request(`/tour/requests/${tourId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      // Refresh tours list
      fetchTours();
    } catch (error) {
      console.error('Error updating tour status:', error);
      alert('Failed to update tour status');
    }
  };

  const filteredTours = tours.filter(tour => {
    const matchesFilter = filter === 'all' || tour.tourStatus === filter;
    const matchesSearch = tour.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tour.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleBack = () => {
    navigate('/admin-dashboard');
  };

  const handleQRScanner = () => {
    navigate('/admin/qr-scanner');
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container tour-management-container">
      <button onClick={handleBack} className="back-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="header-section">
        <h1 className="main-title">Tour Management</h1>
        <p className="main-subtitle">Manage visitor tours and QR scanning</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={handleQRScanner} className="qr-scanner-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
            <rect x="16" y="3" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
            <rect x="3" y="16" width="5" height="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 16H16V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          QR Scanner
        </button>
        <button onClick={fetchTours} className="refresh-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="tour-controls">
        <div className="filter-section">
          <label className="input-label">Filter by Status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Tours</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="search-section">
          <label className="input-label">Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="search-input"
          />
        </div>
      </div>

      {/* Tours List */}
      <div className="tours-list">
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchTours} className="retry-button">Retry</button>
          </div>
        )}

        {filteredTours.length === 0 && !error && (
          <div className="no-tours">
            <p>No tours found matching your criteria.</p>
          </div>
        )}

        {filteredTours.map(tour => (
          <div key={tour._id} className="tour-card">
            <div className="tour-header">
              <h3>{tour.fullName}</h3>
              <span 
                className="tour-status"
                style={{ backgroundColor: getStatusColor(tour.tourStatus) }}
              >
                {tour.tourStatus.toUpperCase()}
              </span>
            </div>

            <div className="tour-details">
              <div className="tour-info">
                <p><strong>Email:</strong> {tour.email}</p>
                <p><strong>Phone:</strong> {tour.phoneNumber}</p>
                <p><strong>Date:</strong> {new Date(tour.tourDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {tour.tourTime}</p>
                <p><strong>Exam:</strong> {tour.examPreparation}</p>
              </div>

              <div className="tour-actions">
                {tour.tourStatus === 'pending' && (
                  <button 
                    onClick={() => updateTourStatus(tour._id, 'confirmed')}
                    className="confirm-button"
                  >
                    Confirm Tour
                  </button>
                )}
                
                {tour.tourStatus === 'confirmed' && (
                  <button 
                    onClick={() => updateTourStatus(tour._id, 'completed')}
                    className="complete-button"
                  >
                    Mark Complete
                  </button>
                )}

                {(tour.tourStatus === 'pending' || tour.tourStatus === 'confirmed') && (
                  <button 
                    onClick={() => updateTourStatus(tour._id, 'cancelled')}
                    className="cancel-button"
                  >
                    Cancel Tour
                  </button>
                )}
              </div>
            </div>

            {tour.adminNotes && (
              <div className="admin-notes">
                <strong>Admin Notes:</strong> {tour.adminNotes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}