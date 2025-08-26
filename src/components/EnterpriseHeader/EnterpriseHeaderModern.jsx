import React, { useState } from 'react';
import '../../styles/enterprise-header-modern.css';

const EnterpriseHeaderModern = ({ children, className = '' }) => {
  return (
    <div className={`enterprise-header-modern ${className}`}>
      <div className="header-content-modern">
        {children}
      </div>
    </div>
  );
};

// Icon-based Tab Group
export const TabGroup = ({ children }) => (
  <div className="tab-group-modern">{children}</div>
);

// Icon Tab Button with Tooltip
export const TabButton = ({ active, onClick, icon: Icon, children, badge }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="tab-button-wrapper">
      <button
        className={`tab-btn-modern ${active ? 'active' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {Icon && <Icon size={20} strokeWidth={2} />}
        {badge && <span className="tab-badge-modern">{badge}</span>}
      </button>
      {children && showTooltip && (
        <div className="tooltip-modern">
          {children}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

export const HeaderDivider = () => (
  <div className="header-divider-modern" />
);

// Action Group with Icons
export const ActionGroup = ({ children }) => (
  <div className="action-group-modern">{children}</div>
);

// Icon Action Button with Tooltip
export const ActionButton = ({ 
  onClick, 
  icon: Icon, 
  children, 
  primary = false, 
  secondary = false, 
  danger = false,
  success = false,
  disabled = false 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getVariantClass = () => {
    if (primary) return 'primary';
    if (secondary) return 'secondary';
    if (danger) return 'danger';
    if (success) return 'success';
    return 'default';
  };
  
  return (
    <div className="action-button-wrapper">
      <button
        className={`action-btn-modern action-btn-modern--${getVariantClass()}`}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {Icon && <Icon size={20} strokeWidth={2} />}
      </button>
      {children && showTooltip && !disabled && (
        <div className="tooltip-modern">
          {children}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

// Icon Only Button
export const IconButton = ({ onClick, icon: Icon, title, variant = 'default', size = 'md', disabled = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24
  };
  
  const sizeClass = {
    sm: 'icon-btn-sm',
    md: 'icon-btn-md',
    lg: 'icon-btn-lg'
  };
  
  return (
    <div className="icon-button-wrapper">
      <button
        className={`icon-btn-modern icon-btn-modern--${variant} ${sizeClass[size]}`}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={title}
      >
        <Icon size={sizeMap[size]} strokeWidth={2} />
      </button>
      {title && showTooltip && !disabled && (
        <div className="tooltip-modern">
          {title}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

// Dropdown Button with Icon
export const DropdownButton = ({ 
  icon: Icon, 
  children, 
  items = [],
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="dropdown-wrapper">
      <button
        className="dropdown-btn-modern"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {Icon && <Icon size={20} strokeWidth={2} />}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="dropdown-chevron">
          <path d="M6 8L2 4h8L6 8z" />
        </svg>
      </button>
      {children && showTooltip && !isOpen && (
        <div className="tooltip-modern">
          {children}
          <div className="tooltip-arrow" />
        </div>
      )}
      {isOpen && (
        <>
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
          <div className={`dropdown-menu-modern dropdown-menu-modern--${align}`}>
            {items.map((item, index) => (
              <button
                key={index}
                className="dropdown-item-modern"
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
              >
                {item.icon && <item.icon size={16} strokeWidth={2} />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Toggle Button Group
export const ToggleGroup = ({ children, value, onChange }) => {
  return (
    <div className="toggle-group-modern">
      {React.Children.map(children, child => 
        React.cloneElement(child, {
          active: child.props.value === value,
          onClick: () => onChange(child.props.value)
        })
      )}
    </div>
  );
};

// Toggle Button
export const ToggleButton = ({ value, icon: Icon, children, active, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="toggle-button-wrapper">
      <button
        className={`toggle-btn-modern ${active ? 'active' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {Icon && <Icon size={18} strokeWidth={2} />}
      </button>
      {children && showTooltip && (
        <div className="tooltip-modern">
          {children}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

export default EnterpriseHeaderModern;