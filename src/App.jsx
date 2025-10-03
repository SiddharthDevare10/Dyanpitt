import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProgressProtectedRoute from './components/ProgressProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Loading component
const LoadingSpinner = () => (
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

// Lazy load shared screens (used by both user and admin)
const LoginScreen = lazy(() => import('./screens/shared/LoginScreen.jsx'));
const RegisterScreen = lazy(() => import('./screens/shared/RegisterScreen.jsx'));
const ForgotPasswordScreen = lazy(() => import('./screens/shared/ForgotPasswordScreen.jsx'));

// Lazy load user screens
const LandingScreen = lazy(() => import('./screens/user/LandingScreen.jsx'));
const TourRequestScreen = lazy(() => import('./screens/user/TourRequestScreen.jsx'));
const VisitorPassScreen = lazy(() => import('./screens/user/VisitorPassScreen.jsx'));
const CongratulationsScreen = lazy(() => import('./screens/user/CongratulationsScreen.jsx'));
const CashPaymentPendingScreen = lazy(() => import('./screens/user/CashPaymentPendingScreen.jsx'));
const PaymentSuccessScreen = lazy(() => import('./screens/user/PaymentSuccessScreen.jsx'));
const MembershipDetailsScreen = lazy(() => import('./screens/user/MembershipDetailsScreen.jsx'));
const BookingScreen = lazy(() => import('./screens/user/BookingScreen.jsx'));
const PaymentScreen = lazy(() => import('./screens/user/PaymentScreen.jsx'));
const DashboardScreen = lazy(() => import('./screens/user/DashboardScreen.jsx'));

// Lazy load admin screens
const AdminDashboardScreen = lazy(() => import('./screens/admin/AdminDashboardScreen.jsx'));
const UserManagementScreen = lazy(() => import('./screens/admin/UserManagementScreen.jsx'));
const QRScannerScreen = lazy(() => import('./screens/admin/QRScannerScreen.jsx'));
const TourManagementScreen = lazy(() => import('./screens/admin/TourManagementScreen.jsx'));
const CashPaymentManagementScreen = lazy(() => import('./screens/admin/CashPaymentManagementScreen.jsx'));

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
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

          <Route 
            path="/visitor-pass" 
            element={
              <ProtectedRoute requireAuth={false}>
                <VisitorPassScreen />
              </ProtectedRoute>
            } 
          />

          {/* Special route for congratulations - accessible without auth */}
          <Route path="/congratulations" element={<CongratulationsScreen />} />
          <Route path="/cash-payment-pending" element={<CashPaymentPendingScreen />} />
          <Route path="/payment-success" element={<PaymentSuccessScreen />} />

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

          <Route 
            path="/admin/tour-management" 
            element={
              <ProtectedRoute requireAuth={true} requireAdmin={true}>
                <TourManagementScreen />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin/qr-scanner" 
            element={
              <ProtectedRoute requireAuth={true} requireAdmin={true}>
                <QRScannerScreen />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin/cash-payments" 
            element={
              <ProtectedRoute requireAuth={true} requireAdmin={true}>
                <CashPaymentManagementScreen />
              </ProtectedRoute>
            } 
          />

          {/* Catch all route - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}