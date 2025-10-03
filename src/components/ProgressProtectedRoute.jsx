import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { 
  validateUserProgress, 
  validatePaymentAccess, 
  validateDashboardAccess,
  PROGRESS_STEPS 
} from '../utils/progressValidation.js';

const ProgressProtectedRoute = ({ children, requiredStep }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
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
    return children;
  }

  // Must be authenticated to access progress routes
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Use centralized validation logic based on the required step
  let validationResult;

  switch (requiredStep) {
    case PROGRESS_STEPS.PAYMENT:
      // Payment step has special validation logic
      validationResult = validatePaymentAccess(user, location.state);
      break;
      
    case PROGRESS_STEPS.DASHBOARD:
      // Dashboard has special validation logic
      validationResult = validateDashboardAccess(user);
      break;
      
    default:
      // Use standard validation for membership and booking steps
      validationResult = validateUserProgress(user, requiredStep);
      break;
  }

  // If validation failed, redirect to the appropriate step
  if (!validationResult.isValid && validationResult.redirectTo) {
    console.log(`ProgressProtectedRoute: Redirecting to ${validationResult.redirectTo} - ${validationResult.reason}`);
    return <Navigate to={validationResult.redirectTo} replace />;
  }

  // Validation passed, render the children
  return children;
};

export default ProgressProtectedRoute;