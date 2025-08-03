import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProgressProtectedRoute from './components/ProgressProtectedRoute.jsx';

// Shared screens (used by both user and admin)
import LoginScreen from './screens/shared/LoginScreen.jsx';
import RegisterScreen from './screens/shared/RegisterScreen.jsx';
import ForgotPasswordScreen from './screens/shared/ForgotPasswordScreen.jsx';

// User screens
import LandingScreen from './screens/user/LandingScreen.jsx';
import TourRequestScreen from './screens/user/TourRequestScreen.jsx';
import CongratulationsScreen from './screens/user/CongratulationsScreen.jsx';
import MembershipDetailsScreen from './screens/user/MembershipDetailsScreen.jsx';
import BookingScreen from './screens/user/BookingScreen.jsx';
import PaymentScreen from './screens/user/PaymentScreen.jsx';
import DashboardScreen from './screens/user/DashboardScreen.jsx';

// Admin screens
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen.jsx';
import UserManagementScreen from './screens/admin/UserManagementScreen.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute requireAuth={false}>
                <LandingScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/login" 
            element={
              <ProtectedRoute requireAuth={false}>
                <LoginScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/register" 
            element={
              <ProtectedRoute requireAuth={false}>
                <RegisterScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/forgot-password" 
            element={
              <ProtectedRoute requireAuth={false}>
                <ForgotPasswordScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tour" 
            element={
              <ProtectedRoute requireAuth={false}>
                <TourRequestScreen />
              </ProtectedRoute>
            } 
          />

          {/* Special route for congratulations - accessible without auth */}
          <Route path="/congratulations" element={<CongratulationsScreen />} />

          {/* Protected progress routes */}
          <Route 
            path="/membership" 
            element={
              <ProgressProtectedRoute requiredStep="membership">
                <MembershipDetailsScreen />
              </ProgressProtectedRoute>
            } 
          />
          
          <Route 
            path="/booking" 
            element={
              <ProgressProtectedRoute requiredStep="booking">
                <BookingScreen />
              </ProgressProtectedRoute>
            } 
          />
          
          <Route 
            path="/payment" 
            element={
              <ProgressProtectedRoute requiredStep="payment">
                <PaymentScreen />
              </ProgressProtectedRoute>
            } 
          />

          {/* User dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProgressProtectedRoute requiredStep="dashboard">
                <DashboardScreen />
              </ProgressProtectedRoute>
            } 
          />

          {/* Admin routes */}
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute requireAuth={true} requireAdmin={true}>
                <AdminDashboardScreen />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/user-management" 
            element={
              <ProtectedRoute requireAuth={true} requireAdmin={true}>
                <UserManagementScreen />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}