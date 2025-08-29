import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, X } from 'lucide-react';
import './MobileActionsButton.css';

const MobileActionsButton = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Parse menu items from children
  const parseMenuItems = () => {
    const items = [];
    
    React.Children.forEach(children, (child) => {
      if (!child) return;
      
      // Handle buttons and action elements
      if (React.isValidElement(child)) {
        items.push(child);
      }
    });
    
    return items;
  };

  const menuItems = parseMenuItems();

  const handleItemClick = (onClick) => {
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className={`mobile-actions-button ${className}`}>
      <button
        ref={buttonRef}
        className={`mobile-actions-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <>
          <div 
            className="mobile-actions-backdrop" 
            onClick={() => setIsOpen(false)} 
            aria-label="Close menu" 
          />
          <div 
            ref={dropdownRef}
            className="mobile-actions-dropdown"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="mobile-actions-header">
              <h3>Actions</h3>
              <button
                className="mobile-actions-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="mobile-actions-content">
              {menuItems.map((item, index) => {
                if (React.isValidElement(item)) {
                  return React.cloneElement(item, {
                    key: index,
                    className: `mobile-action-item ${item.props.className || ''}`,
                    onClick: () => handleItemClick(item.props.onClick)
                  });
                }
                return null;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileActionsButton;