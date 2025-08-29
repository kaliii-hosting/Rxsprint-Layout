import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronDown, X } from 'lucide-react';
import './SafePageSettings.css';
import './SafePageSettingsAntiGlitch.css';
import './SafePageSettingsDesktopHide.css';

const SafePageSettings = ({ 
  menuItems = [], // Array of menu items with { icon, label, onClick, disabled }
  className = '',
  buttonText = 'Actions',
  showIcon = true,
  position = 'bottom-right',
  buttonVariant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Initialize component safely
  useEffect(() => {
    // Mark as initialized immediately to prevent any delays
    setIsInitialized(true);
  }, []);

  // Close dropdown when clicking outside - simple implementation
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleItemClick = (onClick) => {
    if (onClick && typeof onClick === 'function') {
      onClick();
    }
    setIsOpen(false);
  };

  return (
    <div 
      className={`safe-page-settings ${className}`}
      data-initialized={isInitialized ? "true" : "false"}
    >
      <button
        ref={buttonRef}
        className={`safe-settings-trigger ${isOpen ? 'active' : ''} ${buttonVariant}`}
        onClick={handleButtonClick}
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
      >
        {showIcon && <Settings size={18} />}
        {buttonVariant !== 'icon-only' && <span>{buttonText}</span>}
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="safe-dropdown-backdrop" 
            onClick={() => setIsOpen(false)} 
            aria-label="Close dropdown" 
          />
          <div 
            ref={dropdownRef}
            className={`safe-settings-dropdown ${position}`}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="safe-page-settings-button"
          >
            <div className="safe-dropdown-header">
              <h3>{buttonText}</h3>
              <button
                className="safe-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="safe-dropdown-content">
              {menuItems.map((item, index) => {
                // Handle separator
                if (item.separator) {
                  return <div key={index} className="safe-menu-separator" />;
                }

                const IconComponent = item.icon;
                const isDisabled = item.disabled || false;
                const isActive = item.active || false;
                
                return (
                  <button
                    key={index}
                    className={`safe-menu-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && handleItemClick(item.onClick)}
                    disabled={isDisabled}
                    title={item.tooltip || item.label}
                    type="button"
                  >
                    {IconComponent && (
                      <span className="safe-menu-icon">
                        <IconComponent size={16} />
                      </span>
                    )}
                    <span className="safe-menu-label">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SafePageSettings;