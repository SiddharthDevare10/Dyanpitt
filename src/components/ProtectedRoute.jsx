import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDemoMode } from './DemoMode.jsx';

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false, redirectTo = '/login' }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const { demoMode, demoUser, demoAdminUser } = useDemoMode();
  const location = useLocation();

  // In demo mode, bypass all authentication checks
  if (demoMode) {
    return children;
  }


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
    // Redirect to appropriate dashboard based on user completion status
    if (user) {
      if (!user.membershipCompleted) {
        return <Navigate to="/membership" replace />;
      } else if (!user.bookingCompleted) {
        return <Navigate to="/booking" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
    return <Navigate to="/login" replace />;
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
    
    // Admin users should always go to admin dashboard when accessing auth pages
    if (user.role === 'admin' || user.role === 'super_admin') {
      return <Navigate to="/admin-dashboard" replace />;
    }
    
    // For auth pages (login/register/forgot-password), redirect authenticated users appropriately
    if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password') {
      // Always redirect to dashboard if user is fully completed
      if (user.membershipCompleted && user.bookingCompleted) {
        return <Navigate to="/dashboard" replace />;
      }
      // Otherwise redirect to their next step in the flow
      else if (user.membershipCompleted && !user.bookingCompleted) {
        return <Navigate to="/booking" replace />;
      } else {
        return <Navigate to="/membership" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;