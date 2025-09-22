import { createContext, useContext, useState } from 'react';

const DemoContext = createContext();

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider = ({ children }) => {
  // Check if demo mode is enabled via URL parameter or localStorage
  const isDemoMode = () => {
    return window.location.search.includes('demo=true') || 
           localStorage.getItem('demoMode') === 'true';
  };

  const [demoMode, setDemoMode] = useState(isDemoMode());

  const enableDemoMode = () => {
    setDemoMode(true);
    localStorage.setItem('demoMode', 'true');
  };

  const disableDemoMode = () => {
    setDemoMode(false);
    localStorage.removeItem('demoMode');
  };

  // Mock user data for demo purposes
  const demoUser = {
    _id: 'demo-user-id',
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    membershipCompleted: true,
    bookingCompleted: true,
    isVerified: true
  };

  const demoAdminUser = {
    _id: 'demo-admin-id',
    email: 'admin@example.com',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'admin',
    membershipCompleted: true,
    bookingCompleted: true,
    isVerified: true
  };

  const value = {
    demoMode,
    enableDemoMode,
    disableDemoMode,
    demoUser,
    demoAdminUser
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};