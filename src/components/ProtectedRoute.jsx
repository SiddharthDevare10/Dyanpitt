import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

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

  // If user is authenticated but trying to access auth pages, redirect appropriately
  if (!requireAuth && isAuthenticated && user) {
    // Determine where to redirect based on user completion status
    if (!user.membershipCompleted) {
      return <Navigate to="/membership" replace />;
    } else if (!user.bookingCompleted) {
      return <Navigate to="/booking" replace />;
    } else if (user.role === 'admin' || user.role === 'super_admin') {
      return <Navigate to="/admin-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;