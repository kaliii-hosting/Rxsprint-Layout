import React, { useState } from 'react';
import '../../styles/modern-toolbar.css';

// Modern Toolbar Component with Icon Buttons and Tooltips
const ModernToolbar = ({ children, className = '' }) => {
  return (
    <div className={`modern-toolbar ${className}`}>
      <div className="toolbar-content">
        {children}
      </div>
    </div>
  );
};

// Icon Button with Tooltip
export const IconButton = ({ 
  onClick, 
  icon: Icon, 
  title, 
  active = false,
  variant = 'default', // default, primary, secondary, danger, success
  size = 'md', // sm, md, lg
  disabled = false,
  badge = null,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="icon-button-wrapper">
      <button
        className={`icon-button icon-button--${variant} icon-button--${size} ${active ? 'active' : ''} ${className}`}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={title}
      >
        {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
        {badge && <span className="icon-button-badge">{badge}</span>}
      </button>
      {title && showTooltip && !disabled && (
        <div className="tooltip">
          {title}
        </div>
      )}
    </div>
  );
};

// Button Group for grouping related actions
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`button-group ${className}`}>
    {children}
  </div>
);

// Divider for separating groups
export const ToolbarDivider = () => (
  <div className="toolbar-divider" />
);

// Tab Button with Icon and Optional Text (responsive)
export const TabButton = ({ 
  active, 
  onClick, 
  icon: Icon, 
  children, 
  badge,
  showTextOnMobile = false 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="tab-button-wrapper">
      <button
        className={`tab-button ${active ? 'active' : ''} ${showTextOnMobile ? 'show-text-mobile' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={typeof children === 'string' ? children : ''}
      >
        {Icon && <Icon size={18} />}
        <span className="tab-button-text">{children}</span>
        {badge && <span className="tab-button-badge">{badge}</span>}
      </button>
      {!showTextOnMobile && typeof children === 'string' && showTooltip && (
        <div className="tooltip">
          {children}
        </div>
      )}
    </div>
  );
};

// Action Button with Icon and Text
export const ActionButton = ({ 
  onClick, 
  icon: Icon, 
  children, 
  variant = 'default', // default, primary, secondary, outline
  size = 'md',
  disabled = false,
  className = ''
}) => {
  return (
    <button
      className={`action-button action-button--${variant} action-button--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} />}
      {children && <span className="action-button-text">{children}</span>}
    </button>
  );
};

// Dropdown Button
export const DropdownButton = ({ 
  icon: Icon, 
  children, 
  items = [],
  align = 'left' // left, right
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="dropdown-button-wrapper">
      <button
        className="dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon size={18} />}
        <span>{children}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L2 4h8L6 8z" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
          <div className={`dropdown-menu dropdown-menu--${align}`}>
            {items.map((item, index) => (
              <button
                key={index}
                className="dropdown-item"
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
              >
                {item.icon && <item.icon size={16} />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Search Input
export const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  className = '' 
}) => {
  return (
    <div className={`search-input-wrapper ${className}`}>
      <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2"/>
        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

// Spacer for flexible spacing
export const ToolbarSpacer = () => (
  <div className="toolbar-spacer" />
);

export default ModernToolbar;