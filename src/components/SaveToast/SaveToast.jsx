import React, { useEffect } from 'react';
import { X, Check, AlertCircle, RefreshCcw } from 'lucide-react';
import './SaveToast.css';

const SaveToast = ({ 
  status = 'saved', // 'saved', 'saving', 'error'
  message = '',
  onClose,
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  useEffect(() => {
    if (autoClose && status === 'saved') {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [status, autoClose, autoCloseDelay, onClose]);

  const getIcon = () => {
    switch (status) {
      case 'saved':
        return <Check size={20} className="toast-icon-success" />;
      case 'saving':
        return <RefreshCcw size={20} className="toast-icon-saving spin-animation" />;
      case 'error':
        return <AlertCircle size={20} className="toast-icon-error" />;
      default:
        return null;
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'saved':
        return 'Changes saved successfully';
      case 'saving':
        return 'Saving changes...';
      case 'error':
        return 'Failed to save changes';
      default:
        return '';
    }
  };

  if (!status) return null;

  return (
    <div className={`save-toast ${status}`}>
      <div className="toast-content">
        {getIcon()}
        <span className="toast-message">{getMessage()}</span>
      </div>
      <button 
        className="toast-close-btn"
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default SaveToast;