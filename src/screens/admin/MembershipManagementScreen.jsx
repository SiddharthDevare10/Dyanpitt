import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Calendar, Users, BookOpen, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import logger from '../../utils/logger';

export default function MembershipManagementScreen() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    examPreparation: '',
    educationalBackground: '',
    currentOccupation: '',
    visitedBefore: ''
  });

  // Selected membership for detailed view
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchMemberships();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, filters]);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      });

      const response = await apiService.request(`/membership/all?${queryParams}`);
      
      if (response.success) {
        setMemberships(response.data.memberships);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.message || 'Failed to fetch memberships');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch memberships');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.request('/membership/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const response = await apiService.request(`/membership/export?format=${format}`);
      
      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memberships.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memberships.json';
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
      examPreparation: '',
      educationalBackground: '',
      currentOccupation: '',
      visitedBefore: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const showMembershipDetails = (membership) => {
    setSelectedMembership(membership);
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
    <div className="main-container">
      <div className="header-section">
        <h1 className="main-title">Membership Management</h1>
        <p className="main-subtitle">View and manage all membership applications</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={20} color="#3b82f6" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Memberships</h3>
            </div>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
              {stats.overview.totalMemberships}
            </p>
          </div>
          
          <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Visited Before</h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
              Yes: {stats.overview.visitedBeforeYes} | No: {stats.overview.visitedBeforeNo}
            </p>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <BookOpen size={20} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Top Exam</h3>
            </div>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
              {stats.examPreparation[0]?.id || 'N/A'} ({stats.examPreparation[0]?.count || 0})
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
            value={filters.examPreparation}
            onChange={(e) => handleFilterChange('examPreparation', e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
          >
            <option value="">All Exams</option>
            <option value="MPSC">MPSC</option>
            <option value="UPSC">UPSC</option>
            <option value="Railway">Railway</option>
            <option value="Banking">Banking</option>
            <option value="NEET">NEET</option>
            <option value="JEE">JEE</option>
            {/* Add more options as needed */}
          </select>

          <select
            value={filters.visitedBefore}
            onChange={(e) => handleFilterChange('visitedBefore', e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' }}
          >
            <option value="">All Visitors</option>
            <option value="yes">Visited Before</option>
            <option value="no">First Time</option>
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
          <p>Loading memberships...</p>
        </div>
      ) : (
        <>
          {/* Memberships Table */}
          <div className="table-container" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Dyanpitt ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Exam</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Education</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Visited Before</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Submitted</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr key={membership._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}>{membership.userFullName}</td>
                    <td style={{ padding: '0.75rem' }}>{membership.userEmail}</td>
                    <td style={{ padding: '0.75rem' }}>{membership.userDyanpittId || 'Pending'}</td>
                    <td style={{ padding: '0.75rem' }}>{membership.examPreparation}</td>
                    <td style={{ padding: '0.75rem' }}>{membership.educationalBackground}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: membership.visitedBefore === 'yes' ? '#dcfce7' : '#fef3c7',
                        color: membership.visitedBefore === 'yes' ? '#166534' : '#92400e'
                      }}>
                        {membership.visitedBefore === 'yes' ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{formatDate(membership.submittedAt)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => showMembershipDetails(membership)}
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

      {/* Detail Modal */}
      {showDetailModal && selectedMembership && (
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Membership Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Full Name</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.userFullName}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Email</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.userEmail}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Dyanpitt ID</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.userDyanpittId || 'Not assigned'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Phone Number</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.userPhoneNumber}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Father's Name</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.fatherName}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Parent Contact</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.parentContactNumber}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Educational Background</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.educationalBackground}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Current Occupation</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.currentOccupation}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Job Title</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.jobTitle || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Exam Preparation</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.examPreparation}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Examination Date</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{formatDate(selectedMembership.examinationDate)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Visited Before</label>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{selectedMembership.visitedBefore === 'yes' ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {selectedMembership.selfiePhotoUrl && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Selfie Photo</label>
                  <img
                    src={selectedMembership.selfiePhotoUrl}
                    alt="Selfie"
                    style={{
                      marginTop: '0.5rem',
                      maxWidth: '200px',
                      height: 'auto',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}