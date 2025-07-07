import React, { createContext, useContext, useState } from 'react';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlock = () => {
    setIsUnlocked(true);
  };

  const lock = () => {
    setIsUnlocked(false);
  };

  const value = {
    isUnlocked,
    unlock,
    lock
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};