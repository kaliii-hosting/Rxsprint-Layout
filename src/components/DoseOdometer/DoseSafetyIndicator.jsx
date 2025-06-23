import React from 'react';
import './DoseSafetyIndicator.css';

const DoseSafetyIndicator = ({ doseStatus, value = 0, title = "DOSE SAFETY" }) => {
  // Calculate pointer position based on dose status
  const getPointerPosition = () => {
    switch (doseStatus) {
      case 'low':
        return 16.67; // Left third
      case 'correct':
        return 50; // Center
      case 'high':
        return 83.33; // Right third
      default:
        return 50; // Center default
    }
  };

  const pointerPosition = getPointerPosition();

  return (
    <div className="dose-safety-indicator">
      <div className="dose-title">{title}</div>
      <div className="dose-gauge">
        <div className="dose-sections">
          <div className="dose-section low-dose">
            <span className="dose-label">LOW DOSE</span>
          </div>
          <div className="dose-section correct-dose">
            <span className="dose-label">CORRECT DOSE</span>
          </div>
          <div className="dose-section high-dose">
            <span className="dose-label">HIGH DOSE</span>
          </div>
        </div>
        <div 
          className="dose-pointer" 
          style={{ left: `${pointerPosition}%` }}
        >
          <div className="pointer-triangle"></div>
        </div>
      </div>
      {value > 0 && (
        <div className="dose-value">
          Current: {value.toFixed(2)} mg/kg
        </div>
      )}
    </div>
  );
};

export default DoseSafetyIndicator;