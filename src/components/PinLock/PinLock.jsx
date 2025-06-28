import React, { useState, useEffect, useRef } from 'react';
import { Lock, X } from 'lucide-react';
import './PinLock.css';

const PinLock = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = '2112';
  
  // Animation refs
  const pinContainerRef = useRef(null);
  const pinDotsRef = useRef([]);
  const pinPadRef = useRef(null);

  // Keyboard handling
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key >= '0' && e.key <= '9' && pin.length < 4) {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length === 4) {
        checkPin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin]);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        setTimeout(() => checkPin(newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  const checkPin = (pinToCheck = pin) => {
    if (pinToCheck === correctPin) {
      // Simple success - just unlock
      setTimeout(onUnlock, 200);
    } else {
      // Error handling
      setError(true);
      
      // Shake animation using CSS
      const container = pinContainerRef.current;
      if (container) {
        container.classList.add('shake');
        setTimeout(() => {
          container.classList.remove('shake');
        }, 500);
      }
      
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  return (
    <div className="pin-lock-overlay">
      <div className="pin-lock-container" ref={pinContainerRef}>
        <div className="pin-lock-icon">
          <Lock size={28} />
        </div>
        
        <h1 className="pin-lock-title">Enter PIN</h1>
        <p className="pin-lock-subtitle">4-digit code required</p>
        
        <div className={`pin-dots ${error ? 'error' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index}
              ref={el => pinDotsRef.current[index] = el}
              className={`pin-dot ${index < pin.length ? 'filled' : ''}`}
            />
          ))}
        </div>
        
        <div className="pin-pad" ref={pinPadRef}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pin-button number"
              onClick={() => handleNumberClick(num.toString())}
              type="button"
            >
              {num}
            </button>
          ))}
          
          <button
            className="pin-button pin-button-empty"
            disabled
            type="button"
          >
          </button>
          
          <button
            className="pin-button number pin-button-zero"
            onClick={() => handleNumberClick('0')}
            type="button"
          >
            0
          </button>
          
          <button
            className="pin-button pin-button-delete"
            onClick={handleDelete}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinLock;