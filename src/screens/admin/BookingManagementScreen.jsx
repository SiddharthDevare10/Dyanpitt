import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Calendar, Users, CreditCard, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import logger from '../../utils/logger';

export default function BookingManagementScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    paymentStatus: '',
    membershipType: '',
    timeSlot: '',
    membershipActive: ''
  });

  // Selected booking for detailed view
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      });

      const response = await apiService.request(`/booking/all?${queryParams}`);
      
      if (response.success) {
        setBookings(response.data.bookings);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.request('/booking/admin/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const response = await apiService.request(`/booking/admin/export?format=${format}`);
      
      if (format === 'csv') {
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookings.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookings.json';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      setError('Failed to export data');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      paymentStatus: '',
      membershipType: '',
      timeSlot: '',
      membershipActive: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const showBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'cash_collected':
        return { bg: '#dcfce7', text: '#166534' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'cash_pending':
        return { bg: '#dbeafe', text: '#1d4ed8' };
      case 'failed':
        return { bg: '#fecaca', text: '#dc2626' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  // Don't render if user is not admin
  if (!user?.isAdmin()) {
    return (
      <div className="main-container">
        <div className="error-message">
          Access denied. Admin privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="main-container admin-page">
      <div className="header-section">
        <h1 className="main-title">Booking Management</h1>
        <p className="main-subtitle">View and manage all bookings and payments</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="admin-stats-grid responsive">
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={20} color="#3b82f6" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Bookings</h3>
            </div>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
              {stats.overview.totalBookings}
            </p>
          </div>
          
          <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Active Members</h3>
            </div>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
              {stats.overview.activeMembers}
            </p>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CreditCard size={20} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Revenue</h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
              {formatCurrency(stats.overview.totalRevenue)}
            </p>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Pending Payments</h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
              {stats.overview.pendingPayments + stats.overview.cashPending}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filter-section" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={handleSearch}
              style={{
                paddingLeft: '2.5rem',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                width: '100%',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <button
            onClick={() => handleExport('csv')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
          >
            <option value="">All Payment Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cash_pending">Cash Pending</option>
            <option value="cash_collected">Cash Collected</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filters.membershipType}
            onChange={(e) => handleFilterChange('membershipType', e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
          >
            <option value="">All Membership Types</option>
            <option value="Dyandhara Kaksh">Dyandhara Kaksh</option>
            <option value="Dyanpurn Kaksh">Dyanpurn Kaksh</option>
            <option value="Dyanasmi Kaksh">Dyanasmi Kaksh</option>
          </select>

          <select
            value={filters.timeSlot}
            onChange={(e) => handleFilterChange('timeSlot', e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
          >
            <option value="">All Time Slots</option>
            <option value="Day Batch (7:00 AM - 10:00 PM)">Day Batch</option>
            <option value="Night Batch (10:00 PM - 7:00 AM)">Night Batch</option>
            <option value="24 Hours Batch">24 Hours</option>
          </select>

          <button
            onClick={clearFilters}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading bookings...</p>
        </div>
      ) : (
        <>
          {/* Bookings Table */}
          <div className="table-container" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Membership</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Time Slot</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Duration</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Amount</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Payment Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Start Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{booking.userFullName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{booking.userEmail}</div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{booking.membershipType}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>{booking.timeSlot}</td>
                    <td style={{ padding: '0.75rem' }}>{booking.membershipDuration}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{formatCurrency(booking.totalAmount)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: getStatusColor(booking.paymentStatus).bg,
                        color: getStatusColor(booking.paymentStatus).text
                      }}>
                        {booking.paymentStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{formatDate(booking.membershipStartDate)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => showBookingDetails(booking)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: currentPage === 1 ? '#f9fafb' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: currentPage === totalPages ? '#f9fafb' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal - We'll create this in the next part */}
      {showDetailModal && selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setShowDetailModal(false)}
          onUpdate={fetchBookings}
        />
      )}
    </div>
  );
}

// Booking Detail Modal Component
function BookingDetailModal({ booking, onClose }) {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Booking Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* User Information */}
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600' }}>User Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Full Name</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.userFullName}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Email</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.userEmail}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Dyanpitt ID</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.userDyanpittId || 'Not assigned'}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Phone Number</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.userPhoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600' }}>Booking Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Membership Type</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.membershipType}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Time Slot</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.timeSlot}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Duration</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.membershipDuration}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Preferred Seat</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.preferredSeat || 'None specified'}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Start Date</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{formatDate(booking.membershipStartDate)}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>End Date</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{formatDate(booking.membershipEndDate)}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600' }}>Payment Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Total Amount</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', fontWeight: '600' }}>{formatCurrency(booking.totalAmount)}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Payment Status</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', fontWeight: '500' }}>
                  {booking.paymentStatus.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Payment Method</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{booking.paymentMethod.toUpperCase()}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Payment Date</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{formatDate(booking.paymentDate)}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding: '1rem', backgroundColor: '#fefce8', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600' }}>Timeline</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Booked At</label>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{formatDate(booking.bookedAt)}</p>
              </div>
              {booking.cashPaymentRequest?.requestDate && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Cash Payment Requested</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{formatDate(booking.cashPaymentRequest.requestDate)}</p>
                </div>
              )}
              {booking.cashPaymentRequest?.collectedDate && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Cash Collected By</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                    {booking.cashPaymentRequest.collectedBy} on {formatDate(booking.cashPaymentRequest.collectedDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}