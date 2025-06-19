import React, { createContext, useState, useContext } from 'react';

const CalculatorContext = createContext();

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};

export const CalculatorProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('calculator');

  const toggleCalculatorMode = () => {
    setActiveTab(prev => prev === 'calculator' ? 'cross' : 'calculator');
  };

  return (
    <CalculatorContext.Provider value={{ activeTab, setActiveTab, toggleCalculatorMode }}>
      {children}
    </CalculatorContext.Provider>
  );
};