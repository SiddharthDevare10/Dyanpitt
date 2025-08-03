import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ProgressProtectedRoute = ({ children, requiredStep }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // 🚨 DEVELOPMENT BYPASS - AUTOMATICALLY DISABLED IN PRODUCTION 🚨
  // This only works when NODE_ENV !== 'production' and import.meta.env.DEV === true
  const isDevelopment = import.meta.env.DEV && import.meta.env.MODE !== 'production';
  const bypassAuth = isDevelopment && window.location.search.includes('bypass=true');
  
  // Extra safety check - log warning if someone tries to use bypass in production
  if (!isDevelopment && window.location.search.includes('bypass=true')) {
    console.warn('🚨 SECURITY: Authentication bypass attempted in production - BLOCKED');
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

  // Development bypass check - ONLY WORKS IN DEVELOPMENT
  if (bypassAuth) {
    console.log('🚧 DEVELOPMENT ONLY: Bypassing authentication for', requiredStep);
    console.log('⚠️  This bypass is AUTOMATICALLY DISABLED in production builds');
    return children;
  }

  // Must be authenticated to access progress routes
  if (!isAuthenticated || !user) {
    console.log('ProgressProtectedRoute: Not authenticated, redirecting to login', {
      isAuthenticated,
      user: user ? 'exists' : 'null',
      requiredStep
    });
    return <Navigate to="/login" replace />;
  }

  // Check progress and redirect accordingly
  switch (requiredStep) {
    case 'membership':
      // Anyone can access membership step
      return children;
      
    case 'booking':
      // Must have completed membership to access booking
      if (!user.membershipCompleted) {
        console.log('ProgressProtectedRoute: Membership not completed, redirecting to membership', {
          membershipCompleted: user.membershipCompleted
        });
        return <Navigate to="/membership" replace />;
      }
      console.log('ProgressProtectedRoute: Access granted to booking');
      return children;
      
    case 'payment':
      // Must have completed membership to access payment
      if (!user.membershipCompleted) {
        return <Navigate to="/membership" replace />;
      }
      // If booking is already completed, redirect to dashboard
      if (user.bookingCompleted) {
        return <Navigate to="/dashboard" replace />;
      }
      return children;
      
    case 'dashboard':
      // Must have completed both membership and booking
      if (!user.membershipCompleted) {
        return <Navigate to="/membership" replace />;
      }
      if (!user.bookingCompleted) {
        return <Navigate to="/booking" replace />;
      }
      return children;
      
    default:
      return children;
  }
};

export default ProgressProtectedRoute;