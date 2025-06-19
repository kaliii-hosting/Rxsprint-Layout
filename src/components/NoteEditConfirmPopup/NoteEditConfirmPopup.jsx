import React, { useState } from 'react';
import { X } from 'lucide-react';
import './NoteEditConfirmPopup.css';

const NoteEditConfirmPopup = ({ isOpen, noteTitle, onConfirm, onCancel, mode = 'edit' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  
  if (!isOpen) return null;
  
  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError(false);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === '2112') {
      setPin('');
      setError(false);
      onConfirm();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };
  
  const handleClose = () => {
    setPin('');
    setError(false);
    onCancel();
  };
  
  const getTitle = () => {
    if (mode === 'edit') {
      return 'Edit Note';
    } else if (mode === 'save') {
      return 'Save Note';
    } else if (mode === 'delete') {
      return 'Delete Note';
    }
    return 'Confirm Action';
  };
  
  const getMessage = () => {
    const noteName = noteTitle || 'this note';
    if (mode === 'edit') {
      return `Enter PIN to edit "${noteName}"`;
    } else if (mode === 'save') {
      return `Enter PIN to save changes to "${noteName}"`;
    } else if (mode === 'delete') {
      return `Enter PIN to delete "${noteName}"`;
    }
    return `Enter PIN to confirm action for "${noteName}"`;
  };
  
  return (
    <div className="note-edit-popup-overlay">
      <div className="note-edit-popup">
        <button className="close-btn" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <h2 className="popup-title">{getTitle()}</h2>
        <p className="popup-message">{getMessage()}</p>
        
        <form onSubmit={handleSubmit}>
          <div className="pin-input-container">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`pin-input ${error ? 'error' : ''}`}
              value={pin}
              onChange={handlePinChange}
              placeholder="••••"
              maxLength="4"
              autoFocus
            />
            {error && <p className="error-message">Incorrect PIN</p>}
          </div>
          
          <div className="popup-actions">
            <button type="button" className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={`confirm-btn ${mode === 'delete' ? 'delete' : ''}`}
              disabled={pin.length !== 4}
            >
              {mode === 'delete' ? 'Delete' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteEditConfirmPopup;