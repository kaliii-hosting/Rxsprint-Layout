import React from 'react';
import '../../styles/enterprise-header.css';

const EnterpriseHeader = ({ children, className = '' }) => {
  return (
    <div className={`enterprise-header ${className}`}>
      <div className="header-content">
        {children}
      </div>
    </div>
  );
};

export const TabGroup = ({ children }) => (
  <div className="tab-group">{children}</div>
);

export const TabButton = ({ active, onClick, icon: Icon, children, badge }) => (
  <button
    className={`tab-btn ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {Icon && <Icon size={16} />}
    <span>{children}</span>
    {badge && <span className="tab-badge">{badge}</span>}
  </button>
);

export const HeaderDivider = () => (
  <div className="header-divider"></div>
);

export const ActionGroup = ({ children }) => (
  <div className="action-group">{children}</div>
);

export const ActionButton = ({ onClick, icon: Icon, children, secondary = false, disabled = false }) => (
  <button
    className={`action-btn ${secondary ? 'secondary' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {Icon && <Icon size={16} />}
    <span>{children}</span>
  </button>
);

export const IconButton = ({ onClick, icon: Icon, title }) => (
  <button
    className="icon-btn"
    onClick={onClick}
    title={title}
  >
    <Icon size={18} />
  </button>
);

export default EnterpriseHeader;