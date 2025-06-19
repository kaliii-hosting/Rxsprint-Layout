import React, { useState } from 'react';

const DebugCalculator = () => {
  const [clicked, setClicked] = useState(false);
  
  const handleClick = () => {
    console.log('Debug button clicked!');
    setClicked(true);
    alert('Button works!');
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>Debug Calculator</h2>
      <button onClick={handleClick}>
        Test Button
      </button>
      {clicked && <p>Button was clicked!</p>}
    </div>
  );
};

export default DebugCalculator;