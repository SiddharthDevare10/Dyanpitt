import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import logger from '../../utils/logger';

const UserManagementScreen = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiService.getAdminUsersWithBookings({ page, limit, search: searchTerm });
        if (res?.success && res.data) {
          // Normalize into a flat list
          const list = Array.isArray(res.data?.users) ? res.data.users : (res.data.items || []);
          setUsers(list);
          const pagination = res.data.pagination || res.pagination || {};
          setTotalPages(pagination.pages || Math.max(1, Math.ceil((pagination.total || list.length) / limit)));
        } else {
          setUsers([]);
          setTotalPages(1);
        }
      } catch (e) {
        logger.error('Fetch admin users failed:', e);
        setError(e.message || 'Failed to fetch users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, limit, searchTerm]);

  const sortedUsers = useMemo(() => {
    const arr = [...users];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = (a?.fullName || a?.name || '').toLowerCase();
      const bv = (b?.fullName || b?.name || '').toLowerCase();
      if (sortBy === 'name') return av > bv ? dir : -dir;
      if (sortBy === 'email') return (a?.email||'').localeCompare(b?.email||'') * dir;
      // default by createdAt/updatedAt if present
      const ad = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
      const bd = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
      return (ad - bd) * dir;
    });
    return arr;
  }, [users, sortBy, sortDir]);

  return (
    <div className="main-container user-management-container admin-page">
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
          <div className="filters" style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'end'}}>
            <div className="filter-group" style={{flex:1}}>
              <label className="input-label">Search</label>
              <input
                type="text"
                placeholder="Search users by name, email, or Dyanpitt ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="search-input"
                style={{minWidth: '280px'}}
              />
            </div>
            <div className="filter-group">
              <label className="input-label">Sort By</label>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="search-input" style={{minWidth:'160px'}}>
                <option value="createdAt">Created</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label">Direction</label>
              <select value={sortDir} onChange={(e)=>setSortDir(e.target.value)} className="search-input" style={{minWidth:'120px'}}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label">Per Page</label>
              <select value={limit} onChange={(e)=>{ setLimit(Number(e.target.value)); setPage(1); }} className="search-input" style={{minWidth:'120px'}}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="input-label">Export</label>
              <button className="admin-action-button" onClick={async ()=>{
                try {
                  const blob = await apiService.downloadAdminExport({ search: searchTerm });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `admin_export_${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  logger.error('CSV export failed', e);
                  alert('CSV export failed');
                }
              }}>Download CSV</button>
            </div>
          </div>
        </div>

        <div className="users-list">
          {loading && (
            <div className="empty-state"><p>Loading...</p></div>
          )}
          {!loading && error && (
            <div className="empty-state"><p>{error}</p></div>
          )}
          {!loading && !error && sortedUsers.length === 0 && (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          )}
          {!loading && !error && sortedUsers.length > 0 && (
            <div className="table-container" style={{overflowX:'auto'}}>
              <div className="admin-card">
                <table className="admin-table" style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left', padding:'8px'}}>Name</th>
                      <th style={{textAlign:'left', padding:'8px'}}>Dyanpitt ID</th>
                      <th style={{textAlign:'left', padding:'8px'}}>Membership</th>
                    </tr>
                  </thead>
                  <tbody>
                  {sortedUsers.map(user => (
                    <tr key={user._id || user.id}>
                      <td style={{padding:'8px'}} data-label="Name">
                        <button className="link-like" style={{color:'#2563eb'}} onClick={()=>setSelectedUser(user)}>
                          {user.fullName || user.name}
                        </button>
                      </td>
                      <td style={{padding:'8px'}} data-label="Dyanpitt ID">{user.dyanpittId || user.dyanpittID || '-'}</td>
                      <td style={{padding:'8px'}} data-label="Membership">
                        {user.bookingDetails ? `${user.bookingDetails.membershipType} (${user.bookingDetails.paymentStatus})` : '-'}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="pagination" style={{display:'flex',gap:'0.5rem',justifyContent:'center',marginTop:'1rem',flexWrap:'wrap'}}>
              <button className="action-button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
              {Array.from({length: totalPages}).slice(0,10).map((_,i)=>{
                const num = i+1;
                return (
                  <button key={num} className="action-button" style={{background: page===num?'#2563eb':'', color: page===num?'#fff':''}} onClick={()=>setPage(num)}>{num}</button>
                );
              })}
              <button className="action-button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
            </div>
          )}
        </div>

        {/* Modal */}
        {selectedUser && (
          <div className="modal-overlay" onClick={()=>setSelectedUser(null)}>
            <div className="modal-content" onClick={(e)=>e.stopPropagation()} style={{maxWidth:'640px'}}>
              <h3>User Details</h3>
              <p><strong>Name:</strong> {selectedUser.fullName || selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Dyanpitt ID:</strong> {selectedUser.dyanpittId || selectedUser.dyanpittID || '-'}</p>
              {selectedUser.phoneNumber && <p><strong>Phone:</strong> {selectedUser.phoneNumber}</p>}
              {selectedUser.bookingDetails && (
                <div className="section">
                  <p><strong>Membership Type:</strong> {selectedUser.bookingDetails.membershipType}</p>
                  <p><strong>Status:</strong> {selectedUser.bookingDetails.paymentStatus}</p>
                  {selectedUser.bookingDetails.membershipStartDate && <p><strong>Start:</strong> {new Date(selectedUser.bookingDetails.membershipStartDate).toLocaleDateString()}</p>}
                  {selectedUser.bookingDetails.membershipEndDate && <p><strong>End:</strong> {new Date(selectedUser.bookingDetails.membershipEndDate).toLocaleDateString()}</p>}
                </div>
              )}
              <div style={{marginTop:'1rem', display:'flex', justifyContent:'flex-end'}}>
                <button className="action-button" onClick={()=>setSelectedUser(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default UserManagementScreen;