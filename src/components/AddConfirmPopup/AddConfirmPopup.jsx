import React, { useState, useEffect, useRef } from 'react';
import { Plus, Lock, X } from 'lucide-react';
import './AddConfirmPopup.css';

const AddConfirmPopup = ({ 
  isOpen, 
  itemType = 'medication', // 'medication' or 'note'
  onConfirm, 
  onCancel 
}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRefs = useRef([]);
  
  const CORRECT_PIN = '1956';

  useEffect(() => {
    if (isOpen) {
      // Focus first input when popup opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      
      // Reset state
      setPin(['', '', '', '']);
      setError(false);
      setIsShaking(false);
    }
  }, [isOpen]);

  const handlePinChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Check if PIN is complete
    if (index === 3 && value) {
      const enteredPin = newPin.join('');
      if (enteredPin === CORRECT_PIN) {
        // Correct PIN
        setTimeout(() => {
          onConfirm();
        }, 200);
      } else {
        // Incorrect PIN
        setError(true);
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    const digits = pastedData.split('').filter(char => /\d/.test(char));
    
    const newPin = ['', '', '', ''];
    digits.forEach((digit, index) => {
      if (index < 4) {
        newPin[index] = digit;
      }
    });
    
    setPin(newPin);
    
    // Focus last filled input or next empty one
    const lastFilledIndex = newPin.findLastIndex(digit => digit !== '');
    if (lastFilledIndex < 3 && newPin[lastFilledIndex + 1] === '') {
      inputRefs.current[lastFilledIndex + 1]?.focus();
    } else {
      inputRefs.current[3]?.focus();
    }
    
    // Check if PIN is complete
    if (newPin.every(digit => digit !== '')) {
      const enteredPin = newPin.join('');
      if (enteredPin === CORRECT_PIN) {
        setTimeout(() => {
          onConfirm();
        }, 200);
      } else {
        setError(true);
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  if (!isOpen) return null;

  const title = itemType === 'medication' ? 'Add New Medication' : 'Add New Note';
  const message = itemType === 'medication' 
    ? 'Enter PIN to add a new medication' 
    : 'Enter PIN to add a new note';
  const buttonText = itemType === 'medication' ? 'Add Medication' : 'Add Note';

  return (
    <div className="add-popup-overlay" onClick={onCancel}>
      <div 
        className={`add-popup ${isShaking ? 'shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onCancel}>
          <X size={20} />
        </button>
        
        <div className="add-icon-wrapper">
          <div className="add-icon">
            <Plus size={48} />
          </div>
        </div>
        
        <h2 className="add-title">{title}</h2>
        
        <p className="add-message">
          {message}
        </p>
        
        <div className="pin-section">
          <div className="pin-label">
            <Lock size={16} />
            <span>Enter PIN to continue</span>
          </div>
          
          <div className="pin-inputs">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength="1"
                className={`pin-input ${error ? 'error' : ''} ${digit ? 'filled' : ''}`}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
              />
            ))}
          </div>
          
          {error && (
            <p className="pin-error">Incorrect PIN. Please try again.</p>
          )}
        </div>
        
        <div className="add-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="confirm-btn"
            disabled={pin.some(digit => !digit)}
          >
            <Plus size={18} />
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddConfirmPopup;