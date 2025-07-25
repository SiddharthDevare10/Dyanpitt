import React, { useState, useEffect } from 'react';
import LandingScreen from './screens/LandingScreen.jsx';
import TourRequestScreen from './screens/TourRequestScreen.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import RegisterScreen from './screens/RegisterScreen.jsx';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen.jsx';
import CongratulationsScreen from './screens/CongratulationsScreen.jsx';
import MembershipDetailsScreen from './screens/MembershipDetailsScreen.jsx';
import BookingScreen from './screens/BookingScreen.jsx';
import PaymentScreen from './screens/PaymentScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import apiService from './services/api.js';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing'); // 'landing', 'tour', 'login', 'register', 'forgot-password', 'congratulations', 'membership', 'booking', 'payment', or 'dashboard'
  const [userData, setUserData] = useState({});

  // Check for route changes and authentication status
  useEffect(() => {
    const checkUserProgress = async () => {
      const path = window.location.pathname;
      
      if (path === '/dashboard') {
        // Check if user is authenticated
        if (apiService.isAuthenticated() || localStorage.getItem('userData')) {
          // Try to get user data from localStorage first (fallback)
          const localUserData = localStorage.getItem('userData');
          
          if (localUserData) {
            try {
              const user = JSON.parse(localUserData);
              
              // Check completion status and redirect accordingly
              if (!user.membershipCompleted) {
                setUserData(user);
                setCurrentScreen('membership');
                // Mark that user came from login, not registration
                sessionStorage.setItem('cameFromRegistration', 'false');
                window.history.replaceState({}, '', '/membership');
              } else if (!user.bookingCompleted) {
                setUserData(user);
                setCurrentScreen('booking');
                window.history.replaceState({}, '', '/booking');
              } else {
                setCurrentScreen('dashboard');
              }
            } catch (error) {
              // Invalid localStorage data, redirect to login
              localStorage.removeItem('userData');
              localStorage.removeItem('authToken');
              window.history.replaceState({}, '', '/');
              setCurrentScreen('login');
            }
          } else {
            // No local data, try API call
            try {
              const response = await apiService.getCurrentUser();
              if (response.success && response.user) {
                const user = response.user;
                localStorage.setItem('userData', JSON.stringify(user));
                
                // Check completion status and redirect accordingly
                if (!user.membershipCompleted) {
                  setUserData(user);
                  setCurrentScreen('membership');
                  // Mark that user came from login, not registration
                  sessionStorage.setItem('cameFromRegistration', 'false');
                  window.history.replaceState({}, '', '/membership');
                } else if (!user.bookingCompleted) {
                  setUserData(user);
                  setCurrentScreen('booking');
                  window.history.replaceState({}, '', '/booking');
                } else {
                  setCurrentScreen('dashboard');
                }
              } else {
                // Invalid user, redirect to login
                window.history.replaceState({}, '', '/');
                setCurrentScreen('login');
              }
            } catch (error) {
              // API error, redirect to login
              localStorage.removeItem('userData');
              localStorage.removeItem('authToken');
              window.history.replaceState({}, '', '/');
              setCurrentScreen('login');
            }
          }
        } else {
          // Not authenticated, redirect to login
          window.history.replaceState({}, '', '/');
          setCurrentScreen('login');
        }
      } else if (path === '/register') {
        setCurrentScreen('register');
      } else if (path === '/tour') {
        setCurrentScreen('tour');
      } else if (path === '/forgot-password') {
        setCurrentScreen('forgot-password');
      } else if (path === '/congratulations') {
        setCurrentScreen('congratulations');
      } else if (path === '/membership') {
        // Check if user is authenticated before allowing access
        if (apiService.isAuthenticated() || localStorage.getItem('userData')) {
          setCurrentScreen('membership');
        } else {
          window.history.replaceState({}, '', '/');
          setCurrentScreen('login');
        }
      } else if (path === '/booking') {
        // Check if user is authenticated and has completed membership
        if (apiService.isAuthenticated() || localStorage.getItem('userData')) {
          try {
            const response = await apiService.getCurrentUser();
            if (response.success && response.user && response.user.membershipCompleted) {
              setUserData(response.user);
              setCurrentScreen('booking');
            } else {
              // Redirect to membership if not completed
              window.history.replaceState({}, '', '/membership');
              setCurrentScreen('membership');
            }
          } catch (error) {
            window.history.replaceState({}, '', '/');
            setCurrentScreen('login');
          }
        } else {
          window.history.replaceState({}, '', '/');
          setCurrentScreen('login');
        }
      } else if (path === '/payment') {
        // Check if user is authenticated and has completed booking
        if (apiService.isAuthenticated() || localStorage.getItem('userData')) {
          try {
            const response = await apiService.getCurrentUser();
            if (response.success && response.user) {
              const user = response.user;
              if (!user.membershipCompleted) {
                window.history.replaceState({}, '', '/membership');
                setCurrentScreen('membership');
              } else if (!user.bookingCompleted) {
                setUserData(user);
                setCurrentScreen('payment');
              } else {
                // Already completed, redirect to dashboard
                window.history.replaceState({}, '', '/dashboard');
                setCurrentScreen('dashboard');
              }
            } else {
              window.history.replaceState({}, '', '/');
              setCurrentScreen('login');
            }
          } catch (error) {
            window.history.replaceState({}, '', '/');
            setCurrentScreen('login');
          }
        } else {
          window.history.replaceState({}, '', '/');
          setCurrentScreen('login');
        }
      } else if (path === '/login') {
        // Handle explicit login path
        setCurrentScreen('login');
      } else if (path === '/') {
        // Handle root path - show landing page for new users
        setCurrentScreen('landing');
      } else {
        // Handle any unknown routes - redirect to landing
        console.log('Unknown route:', path, '- redirecting to landing');
        window.history.replaceState({}, '', '/');
        setCurrentScreen('landing');
      }
    };

    checkUserProgress();

    // Add popstate event listener for browser back/forward buttons
    const handlePopState = () => {
      checkUserProgress();
    };

    window.addEventListener('popstate', handlePopState);

    // Cleanup event listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle navigation
  const navigateToLogin = () => {
    setCurrentScreen('login');
    window.history.pushState({}, '', '/login');
  };

  const navigateToRegister = () => {
    setCurrentScreen('register');
    window.history.pushState({}, '', '/register');
  };

  const navigateToForgotPassword = () => {
    setCurrentScreen('forgot-password');
    window.history.pushState({}, '', '/forgot-password');
  };

  const navigateToTour = () => {
    setCurrentScreen('tour');
    window.history.pushState({}, '', '/tour');
  };

  const navigateToDashboard = () => {
    setCurrentScreen('dashboard');
    window.history.pushState({}, '', '/dashboard');
  };

  // Updated: Congratulations now shows after payment, not registration
  const navigateToCongratulations = (user) => {
    setUserData(user);
    setCurrentScreen('congratulations');
    // Clear any authentication since user needs to re-login with new Dyanpitt ID
    apiService.removeToken();
    localStorage.removeItem('userData');
    window.history.pushState({}, '', '/congratulations');
  };

  const navigateToMembership = () => {
    setCurrentScreen('membership');
    window.history.pushState({}, '', '/membership');
  };

  const navigateToBooking = (user) => {
    setUserData(user);
    setCurrentScreen('booking');
    // Clear the registration flag when moving forward
    sessionStorage.removeItem('cameFromRegistration');
    window.history.pushState({}, '', '/booking');
  };

  const navigateToPayment = (user) => {
    setUserData(user);
    setCurrentScreen('payment');
    window.history.pushState({}, '', '/payment');
  };

  const navigateToLanding = () => {
    setCurrentScreen('landing');
    window.history.pushState({}, '', '/');
  };

  const navigateBack = () => {
    if (currentScreen === 'payment') {
      setCurrentScreen('booking');
      window.history.pushState({}, '', '/booking');
    } else if (currentScreen === 'booking') {
      setCurrentScreen('membership');
      window.history.pushState({}, '', '/membership');
    } else if (currentScreen === 'membership') {
      // Check if user came from registration flow or login flow
      // If they have userData but came from login, go back to login
      // If they came from registration, go to congratulations
      const cameFromRegistration = sessionStorage.getItem('cameFromRegistration');
      if (cameFromRegistration === 'true') {
        setCurrentScreen('congratulations');
        window.history.pushState({}, '', '/congratulations');
      } else {
        // User came from login, logout and go back to login
        apiService.removeToken();
        localStorage.removeItem('userData');
        sessionStorage.removeItem('cameFromRegistration');
        setCurrentScreen('login');
        window.history.pushState({}, '', '/login');
      }
    } else if (currentScreen === 'congratulations') {
      setCurrentScreen('register');
      window.history.pushState({}, '', '/register');
    }
  };

  if (currentScreen === 'landing') {
    return <LandingScreen onNavigateToLogin={navigateToLogin} onNavigateToRegister={navigateToRegister} onNavigateToTour={navigateToTour} />;
  }

  if (currentScreen === 'tour') {
    return <TourRequestScreen onBack={() => setCurrentScreen('landing')} onSubmit={() => setCurrentScreen('landing')} />;
  }

  if (currentScreen === 'register') {
    return <RegisterScreen onNavigateToLogin={navigateToLogin} onNavigateBack={navigateToLanding} />;
  }

  if (currentScreen === 'forgot-password') {
    return <ForgotPasswordScreen onNavigateToLogin={navigateToLogin} />;
  }

  if (currentScreen === 'congratulations') {
    // Congratulations now shows after payment completion with Dyanpitt ID
    // Force user to re-login with new Dyanpitt ID
    return <CongratulationsScreen userData={userData} onContinue={navigateToLogin} />;
  }

  if (currentScreen === 'membership') {
    return <MembershipDetailsScreen userData={userData} onBack={navigateBack} onContinue={navigateToBooking} />;
  }

  if (currentScreen === 'booking') {
    return <BookingScreen userData={userData} onBack={navigateBack} onContinue={navigateToPayment} />;
  }

  if (currentScreen === 'payment') {
    return <PaymentScreen userData={userData} onBack={navigateBack} onContinue={(user) => {
      // Check if user should see congratulations (Dyanpitt ID generated)
      if (user.showCongratulations && user.dyanpittId) {
        navigateToCongratulations(user);
      } else {
        navigateToDashboard();
      }
    }} />;
  }

  if (currentScreen === 'dashboard') {
    return <DashboardScreen />;
  }

  return <LoginScreen onNavigateToRegister={navigateToRegister} onNavigateToForgotPassword={navigateToForgotPassword} onNavigateBack={navigateToLanding} />;
}