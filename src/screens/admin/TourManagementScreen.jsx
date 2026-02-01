import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import logger from '../../utils/logger';

export default function TourManagementScreen() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const fetchTours = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.getTourRequests({ status: status || undefined, date: date || undefined, page: 1, limit: 200 });
      setTours(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      logger.error('Error fetching tours:', e);
      setError(e.message || 'Failed to load tours');
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, [status, date]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  const updateTourStatus = async (tourId, newStatus) => {
    try {
      await apiService.updateTourStatus(tourId, { status: newStatus });
      // Refresh tours list
      fetchTours();
    } catch (error) {
      logger.error('Error updating tour status:', error);
      alert('Failed to update tour status');
    }
  };

  const filteredSorted = useMemo(() => {
    let arr = [...tours];
    // filter by status if selected
    if (status) arr = arr.filter(t => t.tourStatus === status);
    // filter by date if provided
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(start); end.setDate(end.getDate()+1);
      arr = arr.filter(t => {
        const td = new Date(t.tourDate);
        return td >= start && td < end;
      });
    }
    // search by name/email/phone
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(t => (t.fullName||'').toLowerCase().includes(s) || (t.email||'').toLowerCase().includes(s) || (t.phoneNumber||'').includes(s));
    }
    // sort
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a,b)=>{
      if (sortBy === 'name') return ((a.fullName||'').localeCompare(b.fullName||'')) * dir;
      if (sortBy === 'email') return ((a.email||'').localeCompare(b.email||'')) * dir;
      const ad = new Date(a[sortBy] || a.createdAt || 0).getTime();
      const bd = new Date(b[sortBy] || b.createdAt || 0).getTime();
      return (ad - bd) * dir;
    });
    return arr;
  }, [tours, status, date, search, sortBy, sortDir]);

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
        <div className="simple-loading">
          <p>Loading tours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container tour-management-container admin-page">
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
        <div className="filters" style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'end'}}>
          <div className="filter-group">
            <label className="input-label">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Tours</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="input-label">Date</label>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="search-input" />
          </div>
          <div className="filter-group">
            <label className="input-label">Sort By</label>
            <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="filter-select">
              <option value="createdAt">Created</option>
              <option value="tourDate">Tour Date</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="input-label">Direction</label>
            <select value={sortDir} onChange={(e)=>setSortDir(e.target.value)} className="filter-select">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <div className="filter-group" style={{flex:1}}>
            <label className="input-label">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name/email/phone..."
              className="search-input"
            />
          </div>
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

        {filteredSorted.length === 0 && !error && (
          <div className="no-tours">
            <p>No tours found matching your criteria.</p>
          </div>
        )}

        {filteredSorted.map(tour => (
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