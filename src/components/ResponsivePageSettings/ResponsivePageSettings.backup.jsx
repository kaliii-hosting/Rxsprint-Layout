import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronDown, X } from 'lucide-react';
import './ResponsivePageSettings.css';
import './ResponsivePageSettingsGlitchFix.css';

const ResponsivePageSettings = ({ 
  children, 
  className = '',
  buttonText = 'Page Settings',
  showIcon = true,
  position = 'bottom-center', // 'bottom-center', 'bottom-left', 'bottom-right', 'top-left', 'top-right'
  buttonVariant = 'default', // 'default', 'compact', 'icon-only'
  alwaysShowLabels = true // Show labels even on very small screens
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const positionTimer1Ref = useRef(null);
  const positionTimer2Ref = useRef(null);

  // Initialize component without layout impact
  useEffect(() => {
    // Delay initialization to prevent initial layout shift
    initTimeoutRef.current = setTimeout(() => {
      setIsInitialized(true);
    }, 50); // Small delay to ensure DOM is ready

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  // Calculate optimal dropdown position based on viewport space
  const calculateDropdownPosition = useCallback(() => {
    if (!buttonRef.current || !isOpen || !isInitialized) {
      setIsPositioned(false);
      return;
    }

    // Use requestAnimationFrame to avoid layout thrashing
    requestAnimationFrame(() => {
      const button = buttonRef.current?.getBoundingClientRect();
      if (!button) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if we're on mobile
      const isMobile = viewportWidth <= 768;
      
      let styles = {
        position: 'fixed',
        zIndex: 999999,
        opacity: 0 // Start hidden
      };

      if (isMobile) {
        // Mobile positioning: below the button with proper alignment
        const spaceBelow = viewportHeight - button.bottom;
        const dropdownWidth = Math.min(280, viewportWidth - 40);
        
        // Position directly below the button
        styles.top = `${button.bottom + 8}px`;
        
        // Center the dropdown relative to button, but keep within viewport
        const buttonCenter = button.left + (button.width / 2);
        let left = buttonCenter - (dropdownWidth / 2);
        
        // Ensure dropdown stays within viewport bounds
        if (left < 20) left = 20;
        if (left + dropdownWidth > viewportWidth - 20) {
          left = viewportWidth - dropdownWidth - 20;
        }
        
        styles.left = `${left}px`;
        styles.width = `${dropdownWidth}px`;
        styles.maxHeight = `${Math.min(400, spaceBelow - 20)}px`;
      } else {
        // Desktop positioning: below the button
        const spaceBelow = viewportHeight - button.bottom;
        const spaceAbove = button.top;
        
        // Position below button by default
        if (spaceBelow > 200 || spaceBelow > spaceAbove) {
          styles.top = `${button.bottom + 8}px`;
          styles.maxHeight = `${Math.min(400, spaceBelow - 20)}px`;
        } else {
          // Position above if not enough space below
          styles.bottom = `${viewportHeight - button.top + 8}px`;
          styles.maxHeight = `${Math.min(400, spaceAbove - 20)}px`;
        }
        
        // Center horizontally relative to button
        const buttonCenter = button.left + (button.width / 2);
        const dropdownWidth = 280;
        let left = buttonCenter - (dropdownWidth / 2);
        
        // Keep within viewport bounds  
        if (left < 20) left = 20;
        if (left + dropdownWidth > viewportWidth - 20) {
          left = viewportWidth - dropdownWidth - 20;
        }
        
        styles.left = `${left}px`;
        styles.width = `${dropdownWidth}px`;
      }

      setDropdownStyle(styles);
      
      // Show dropdown after positioning
      setTimeout(() => {
        setIsPositioned(true);
        setDropdownStyle(prev => ({ ...prev, opacity: 1 }));
      }, 10);
    });
  }, [isOpen, isInitialized]);

  // Update position when dropdown opens or viewport changes
  useEffect(() => {
    if (isOpen) {
      console.log('Dropdown opened, calculating position...');
      // Use multiple animation frames to avoid layout shift during initial render
      positionTimer1Ref.current = requestAnimationFrame(() => {
        positionTimer2Ref.current = requestAnimationFrame(() => {
          calculateDropdownPosition();
        });
      });
      
      // Recalculate on resize and scroll
      const handleResize = () => {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          calculateDropdownPosition();
        }, 100); // Slower to avoid triggering during rapid changes
      };

      const handleScroll = () => {
        calculateDropdownPosition();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      window.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        window.removeEventListener('scroll', handleScroll);
        if (positionTimer1Ref.current) {
          cancelAnimationFrame(positionTimer1Ref.current);
        }
        if (positionTimer2Ref.current) {
          cancelAnimationFrame(positionTimer2Ref.current);
        }
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }
  }, [isOpen, calculateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleTouchOutside = (event) => {
      // Better touch handling for mobile
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return;
      
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use capture phase for better mobile support
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleTouchOutside, { passive: true, capture: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleTouchOutside, { capture: true });
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Parse children to extract menu items
  const parseMenuItems = () => {
    const items = [];
    
    React.Children.forEach(children, (child) => {
      if (!child) return;
      
      // Handle TabGroup
      if (child.type && child.type.name === 'TabGroup') {
        React.Children.forEach(child.props.children, (tabChild) => {
          if (tabChild && tabChild.type && tabChild.type.name === 'TabButton') {
            items.push({
              type: 'tab',
              element: tabChild,
              props: tabChild.props
            });
          }
        });
      }
      // Handle HeaderDivider
      else if (child.type && child.type.name === 'HeaderDivider') {
        items.push({
          type: 'divider'
        });
      }
      // Handle ActionGroup
      else if (child.type && child.type.name === 'ActionGroup') {
        React.Children.forEach(child.props.children, (actionChild) => {
          if (actionChild && actionChild.type && 
              (actionChild.type.name === 'ActionButton' || actionChild.type.name === 'IconButton')) {
            items.push({
              type: 'action',
              element: actionChild,
              props: actionChild.props
            });
          }
        });
      }
      // Handle standalone buttons
      else if (child.type && 
               (child.type.name === 'TabButton' || 
                child.type.name === 'ActionButton' || 
                child.type.name === 'IconButton')) {
        items.push({
          type: child.type.name === 'TabButton' ? 'tab' : 'action',
          element: child,
          props: child.props
        });
      }
    });
    
    return items;
  };

  const menuItems = parseMenuItems();

  const handleItemClick = (item, onClick) => {
    if (onClick) {
      onClick();
    }
    // Keep menu open for tab selections, close for actions
    if (item.type === 'action') {
      setIsOpen(false);
    }
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Page Settings button clicked, current state:', isOpen);
    const newState = !isOpen;
    setIsOpen(newState);
    
    // Reset positioning state when closing
    if (!newState) {
      setIsPositioned(false);
      setDropdownStyle({});
    }
  };

  return (
    <div className={`responsive-page-settings ${className} ${isInitialized ? 'initialized' : ''}`}>
      <button
        ref={buttonRef}
        id="page-settings-button"
        className={`settings-trigger ${isOpen ? 'active' : ''} ${buttonVariant}`}
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
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} aria-label="Close dropdown" />
          <div 
            ref={dropdownRef}
            className={`settings-dropdown ${position} ${isPositioned ? 'positioned' : ''}`}
            style={dropdownStyle}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="page-settings-button"
          >
          <div className="dropdown-header">
            <h3>Page Settings</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="dropdown-content">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={index} className="menu-divider" />;
              }

              const { 
                icon: Icon, 
                children: label, 
                onClick, 
                active, 
                badge, 
                primary, 
                secondary, 
                disabled,
                title 
              } = item.props || {};

              return (
                <button
                  key={index}
                  className={`menu-item ${item.type} ${active ? 'active' : ''} ${primary ? 'primary' : ''} ${secondary ? 'secondary' : ''}`}
                  onClick={() => handleItemClick(item, onClick)}
                  disabled={disabled}
                  title={title || (typeof label === 'string' ? label : '')}
                  role="menuitem"
                >
                  {Icon && (
                    <span className="item-icon">
                      <Icon size={18} />
                    </span>
                  )}
                  {(alwaysShowLabels || buttonVariant !== 'icon-only') && (
                    <span className="item-label">
                      {label || title || 'Action'}
                    </span>
                  )}
                  {badge && (
                    <span className="item-badge">{badge}</span>
                  )}
                  {active && (
                    <span className="item-indicator" aria-label="Active" />
                  )}
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

// Export menu item components for direct use if needed
export const MenuItem = ({ icon: Icon, label, onClick, active, badge, primary, secondary, disabled }) => (
  <button
    className={`menu-item ${active ? 'active' : ''} ${primary ? 'primary' : ''} ${secondary ? 'secondary' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {Icon && <span className="item-icon"><Icon size={18} /></span>}
    <span className="item-label">{label}</span>
    {badge && <span className="item-badge">{badge}</span>}
    {active && <span className="item-indicator" />}
  </button>
);

export const MenuDivider = () => (
  <div className="menu-divider" />
);

export default ResponsivePageSettings;