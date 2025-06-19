import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import './ConfirmationPopup.css';

const ConfirmationPopup = ({ 
  isOpen, 
  message, 
  onClose, 
  showButtons = false, 
  onContinue, 
  onViewMedication 
}) => {
  useEffect(() => {
    if (isOpen && !showButtons) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto close after 3 seconds only if no buttons

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, showButtons]);

  if (!isOpen) return null;

  return (
    <div className="confirmation-popup-overlay">
      <div className="confirmation-popup">
        <div className="confirmation-icon">
          <CheckCircle size={48} />
        </div>
        <h3 className="confirmation-title">Success!</h3>
        <p className="confirmation-message">{message}</p>
        
        {showButtons && (
          <div className="confirmation-buttons">
            <button 
              className="confirmation-btn continue-btn" 
              onClick={onContinue}
            >
              Continue
            </button>
            <button 
              className="confirmation-btn view-btn" 
              onClick={onViewMedication}
            >
              View Medication
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmationPopup;