import React from 'react';

const CurlinPumpIcon = ({ size = 24, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Pump body outline */}
      <path d="M6 2C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V4C20 2.89543 19.1046 2 18 2H6ZM6 3.5H18C18.2761 3.5 18.5 3.72386 18.5 4V20C18.5 20.2761 18.2761 20.5 18 20.5H6C5.72386 20.5 5.5 20.2761 5.5 20V4C5.5 3.72386 5.72386 3.5 6 3.5Z" fill="currentColor"/>
      
      {/* Screen area */}
      <rect x="6.5" y="4.5" width="11" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
      
      {/* Control buttons */}
      <rect x="7" y="10.5" width="3" height="2" rx="0.4" fill="currentColor" opacity="0.7"/>
      <rect x="10.5" y="10.5" width="3" height="2" rx="0.4" fill="currentColor" opacity="0.7"/>
      <rect x="14" y="10.5" width="3" height="2" rx="0.4" fill="currentColor" opacity="0.7"/>
      
      {/* Numeric keypad - more visible */}
      <circle cx="8.5" cy="15" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="12" cy="15" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="15.5" cy="15" r="1" fill="currentColor" opacity="0.6"/>
      
      <circle cx="8.5" cy="17.5" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="12" cy="17.5" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="15.5" cy="17.5" r="1" fill="currentColor" opacity="0.6"/>
      
      <circle cx="8.5" cy="20" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="12" cy="20" r="1" fill="currentColor" opacity="0.6"/>
      <circle cx="15.5" cy="20" r="1" fill="currentColor" opacity="0.6"/>
    </svg>
  );
};

export default CurlinPumpIcon;