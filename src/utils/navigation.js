// Navigation utility functions for React Router
import { useNavigate } from 'react-router-dom';

export const useAppNavigation = () => {
  const navigate = useNavigate();

  const navigateToLogin = () => navigate('/login');
  const navigateToRegister = () => navigate('/register');
  const navigateToForgotPassword = () => navigate('/forgot-password');
  const navigateToLanding = () => navigate('/');
  const navigateToTour = () => navigate('/tour');
  const navigateToDashboard = () => navigate('/dashboard');
  const navigateToMembership = () => navigate('/membership');
  const navigateToBooking = () => navigate('/booking');
  const navigateToPayment = () => navigate('/payment');
  const navigateToCongratulations = () => navigate('/congratulations');
  const navigateToAdminDashboard = () => navigate('/admin-dashboard');
  const navigateToUserManagement = () => navigate('/user-management');
  const navigateBack = () => navigate(-1);

  return {
    navigateToLogin,
    navigateToRegister,
    navigateToForgotPassword,
    navigateToLanding,
    navigateToTour,
    navigateToDashboard,
    navigateToMembership,
    navigateToBooking,
    navigateToPayment,
    navigateToCongratulations,
    navigateToAdminDashboard,
    navigateToUserManagement,
    navigateBack
  };
};