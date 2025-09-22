import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDemoMode } from './DemoMode.jsx';

const DemoNavigation = () => {
  const { demoMode, enableDemoMode, disableDemoMode } = useDemoMode();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (!demoMode) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        background: '#007bff',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        cursor: 'pointer'
      }} onClick={enableDemoMode}>
        Enable Demo Mode
      </div>
    );
  }

  const allPages = [
    { path: '/', name: 'Landing Page', category: 'Public' },
    { path: '/login', name: 'Login', category: 'Auth' },
    { path: '/register', name: 'Register', category: 'Auth' },
    { path: '/forgot-password', name: 'Forgot Password', category: 'Auth' },
    { path: '/tour', name: 'Tour Request', category: 'Public' },
    { path: '/visitor-pass', name: 'Visitor Pass', category: 'Public' },
    { path: '/congratulations', name: 'Congratulations', category: 'Public' },
    { path: '/membership', name: 'Membership Details', category: 'User Flow' },
    { path: '/booking', name: 'Booking', category: 'User Flow' },
    { path: '/payment', name: 'Payment', category: 'User Flow' },
    { path: '/dashboard', name: 'User Dashboard', category: 'User Flow' },
    { path: '/admin-dashboard', name: 'Admin Dashboard', category: 'Admin' },
    { path: '/user-management', name: 'User Management', category: 'Admin' },
    { path: '/admin/tour-management', name: 'Tour Management', category: 'Admin' },
    { path: '/admin/qr-scanner', name: 'QR Scanner', category: 'Admin' }
  ];

  const groupedPages = allPages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {});

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      background: 'white',
      border: '2px solid #007bff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '280px'
    }}>
      {/* Header */}
      <div style={{
        background: '#007bff',
        color: 'white',
        padding: '12px',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 'bold' }}>🎭 Demo Mode</span>
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '16px'
            }}
          >
            {isOpen ? '−' : '+'}
          </button>
          <button
            onClick={disableDemoMode}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '3px',
              padding: '4px 8px',
              fontSize: '12px'
            }}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Current Page */}
      <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Current Page:</div>
        <div style={{ fontWeight: 'bold', color: '#007bff' }}>
          {allPages.find(p => p.path === location.pathname)?.name || location.pathname}
        </div>
      </div>

      {/* Navigation Links */}
      {isOpen && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {Object.entries(groupedPages).map(([category, pages]) => (
            <div key={category} style={{ padding: '8px 12px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#666',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                {category}
              </div>
              {pages.map(page => (
                <Link
                  key={page.path}
                  to={page.path}
                  style={{
                    display: 'block',
                    padding: '6px 8px',
                    margin: '2px 0',
                    textDecoration: 'none',
                    color: location.pathname === page.path ? '#007bff' : '#333',
                    background: location.pathname === page.path ? '#f8f9fa' : 'transparent',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: location.pathname === page.path ? 'bold' : 'normal'
                  }}
                  onClick={() => setIsOpen(false)}
                >
                  {page.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {isOpen && (
        <div style={{
          padding: '12px',
          background: '#f8f9fa',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>📝 For Content Review:</strong>
          </div>
          <div>Click on any page above to review text content. All authentication is bypassed in demo mode.</div>
        </div>
      )}
    </div>
  );
};

export default DemoNavigation;