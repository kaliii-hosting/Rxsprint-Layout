import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Always use light theme
  const theme = 'light';

  useEffect(() => {
    // Set light theme on mount
    localStorage.setItem('rxsprint-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // No-op functions for compatibility
  const toggleTheme = () => {
    // Theme switching disabled - always light
  };

  const setTheme = () => {
    // Theme setting disabled - always light
  };

  const value = {
    theme,
    toggleTheme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};