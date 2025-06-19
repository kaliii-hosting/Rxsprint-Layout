import React from 'react';
import { CheckCircle } from 'lucide-react';
import './NoteSaveConfirmPopup.css';

const NoteSaveConfirmPopup = ({ isOpen, message, onClose, onViewNote, showButtons = true }) => {
  if (!isOpen) return null;
  
  return (
    <div className="note-save-popup-overlay">
      <div className="note-save-popup">
        <div className="popup-icon">
          <CheckCircle size={48} />
        </div>
        
        <h2 className="popup-title">Success!</h2>
        <p className="popup-message">{message || 'Note saved successfully'}</p>
        
        {showButtons && (
          <div className="popup-actions">
            <button className="continue-btn" onClick={onClose}>
              Continue Editing
            </button>
            <button className="view-note-btn" onClick={onViewNote}>
              View Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteSaveConfirmPopup;