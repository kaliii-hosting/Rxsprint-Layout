import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';

const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="toast-icon" style={{ color: '#28a745' }} />;
      case 'error':
        return <XCircle className="toast-icon" style={{ color: '#dc3545' }} />;
      case 'warning':
      default:
        return <AlertCircle className="toast-icon" style={{ color: '#ffc107' }} />;
    }
  };

  return (
    <div className={`toast-notification ${toast.type}`}>
      {getIcon()}
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={() => removeToast(toast.id)}>
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;