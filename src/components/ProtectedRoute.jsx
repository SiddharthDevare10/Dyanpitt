import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getRedirectPath } from '../utils/progressValidation.js';

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false, redirectTo = '/login' }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();


  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If admin access is required but user is not admin
  if (requireAdmin && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
    // Use centralized redirect logic for consistent behavior
    const redirectPath = getRedirectPath(user);
    return <Navigate to={redirectPath} replace />;
  }

  // If user is admin and accessing admin routes, allow access regardless of completion status
  if (requireAdmin && user && (user.role === 'admin' || user.role === 'super_admin')) {
    return children;
  }

  // If user is authenticated but trying to access public pages, handle appropriately
  if (!requireAuth && isAuthenticated && user) {
    // Allow access to public pages (/, /tour, /visitor-pass, /congratulations) for all authenticated users
    const publicPaths = ['/', '/tour', '/visitor-pass', '/congratulations'];
    if (publicPaths.includes(location.pathname)) {
      return children;
    }
    
    // For auth pages (login/register/forgot-password), redirect authenticated users appropriately
    if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password') {
      // Admin users should always go to admin dashboard
      if (user.role === 'admin' || user.role === 'super_admin') {
        return <Navigate to="/admin-dashboard" replace />;
      }
      
      // Regular users: use centralized redirect logic for consistent behavior
      const redirectPath = getRedirectPath(user);
      // Prevent redirect loops by checking if we're already going to the same path
      if (redirectPath !== location.pathname) {
        return <Navigate to={redirectPath} replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;