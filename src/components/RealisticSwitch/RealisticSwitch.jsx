import React, { useState } from 'react';
import './RealisticSwitch.css';

const RealisticSwitch = ({ onChange, defaultChecked = false }) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const newState = !isChecked;
    setIsChecked(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  return (
    <div className="realistic-switch-container">
      <label className="realistic-switch">
        <input 
          type="checkbox" 
          checked={isChecked}
          onChange={handleToggle}
        />
        <div className="button">
          <div className="light"></div>
          <div className="dots"></div>
          <div className="characters"></div>
          <div className="shine"></div>
          <div className="shadow"></div>
        </div>
      </label>
    </div>
  );
};

export default RealisticSwitch;