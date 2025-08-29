import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Lock, AlertTriangle, X } from 'lucide-react';
import './NoteDeleteConfirmPopup.css';

const NoteDeleteConfirmPopup = ({ 
  isOpen, 
  noteTitle, 
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

  return createPortal(
    <div className="note-deletion-popup-overlay" onClick={onCancel}>
      <div 
        className={`note-deletion-popup ${isShaking ? 'shake' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onCancel}>
          <X size={20} />
        </button>
        
        <div className="note-deletion-icon-wrapper">
          <div className="note-deletion-icon">
            <AlertTriangle size={48} />
          </div>
        </div>
        
        <h2 className="note-deletion-title">Delete Note</h2>
        
        <p className="note-deletion-message">
          Are you sure you want to delete <strong>"{noteTitle}"</strong>?
        </p>
        
        <p className="note-deletion-warning">
          This action cannot be undone.
        </p>
        
        <div className="pin-section">
          <div className="pin-label">
            <Lock size={16} />
            <span>Enter PIN to confirm deletion</span>
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
        
        <div className="note-deletion-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="delete-btn"
            disabled={pin.some(digit => !digit)}
          >
            <Trash2 size={18} />
            Delete Note
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NoteDeleteConfirmPopup;