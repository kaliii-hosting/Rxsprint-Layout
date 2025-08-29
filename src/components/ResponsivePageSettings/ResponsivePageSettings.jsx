import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, ChevronDown, X } from 'lucide-react';
import './ZeroImpactInit.css'; // CRITICAL: Must be first to prevent layout impact
import './ResponsivePageSettings.css';
import './ResponsivePageSettingsGlitchFix.css';
import './AntiGlitchSystem.css';

const ResponsivePageSettings = ({ 
  children, 
  className = '',
  buttonText = 'Page Settings',
  showIcon = true,
  position = 'bottom-center',
  buttonVariant = 'default',
  alwaysShowLabels = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const positionFrameRef = useRef(null);

  // Check if we're at a responsive breakpoint
  const isResponsiveBreakpoint = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const width = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;
    
    // Mobile breakpoint
    if (width <= 968) return true;
    
    // High DPI / Zoom breakpoints
    if (dpr >= 1.25) return true;
    
    return false;
  }, []);

  // Initialize component without layout impact
  useEffect(() => {
    // Only initialize if we're at a responsive breakpoint
    if (!isResponsiveBreakpoint()) {
      return; // Don't initialize on desktop - stay completely hidden
    }
    
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);
    
    initTimeoutRef.current = timer;

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isResponsiveBreakpoint]);

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (!buttonRef.current || !isOpen || !isInitialized || !isResponsiveBreakpoint()) {
      setIsPositioned(false);
      return;
    }

    // Cancel any pending position calculation
    if (positionFrameRef.current) {
      cancelAnimationFrame(positionFrameRef.current);
      positionFrameRef.current = null;
    }

    positionFrameRef.current = requestAnimationFrame(() => {
      const button = buttonRef.current?.getBoundingClientRect();
      if (!button) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth <= 968;
      
      let styles = {
        position: 'fixed',
        zIndex: 999999,
        opacity: 0
      };

      if (isMobile) {
        const dropdownWidth = Math.min(280, viewportWidth - 40);
        const spaceBelow = viewportHeight - button.bottom;
        
        styles.top = `${button.bottom + 8}px`;
        
        const buttonCenter = button.left + (button.width / 2);
        let left = buttonCenter - (dropdownWidth / 2);
        
        if (left < 20) left = 20;
        if (left + dropdownWidth > viewportWidth - 20) {
          left = viewportWidth - dropdownWidth - 20;
        }
        
        styles.left = `${left}px`;
        styles.width = `${dropdownWidth}px`;
        styles.maxHeight = `${Math.min(400, spaceBelow - 20)}px`;
      } else {
        const spaceBelow = viewportHeight - button.bottom;
        const spaceAbove = button.top;
        
        if (spaceBelow > 200 || spaceBelow > spaceAbove) {
          styles.top = `${button.bottom + 8}px`;
          styles.maxHeight = `${Math.min(400, spaceBelow - 20)}px`;
        } else {
          styles.bottom = `${viewportHeight - button.top + 8}px`;
          styles.maxHeight = `${Math.min(400, spaceAbove - 20)}px`;
        }
        
        const buttonCenter = button.left + (button.width / 2);
        const dropdownWidth = 280;
        let left = buttonCenter - (dropdownWidth / 2);
        
        if (left < 20) left = 20;
        if (left + dropdownWidth > viewportWidth - 20) {
          left = viewportWidth - dropdownWidth - 20;
        }
        
        styles.left = `${left}px`;
        styles.width = `${dropdownWidth}px`;
      }

      setDropdownStyle(styles);
      
      setTimeout(() => {
        setIsPositioned(true);
        setDropdownStyle(prev => ({ ...prev, opacity: 1 }));
      }, 10);
      
      positionFrameRef.current = null;
    });
  }, [isOpen, isInitialized]);

  // Handle dropdown position updates
  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();
      
      const handleResize = () => {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          calculateDropdownPosition();
        }, 100);
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
        
        if (positionFrameRef.current) {
          cancelAnimationFrame(positionFrameRef.current);
          positionFrameRef.current = null;
        }
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
          resizeTimeoutRef.current = null;
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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (positionFrameRef.current) {
        cancelAnimationFrame(positionFrameRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  // Parse menu items from children
  const parseMenuItems = () => {
    const items = [];
    
    React.Children.forEach(children, (child) => {
      if (!child) return;
      
      // Handle ActionGroup children
      if (child.type && child.type.displayName === 'ActionGroup') {
        React.Children.forEach(child.props.children, (actionChild) => {
          if (actionChild && actionChild.type) {
            items.push({
              type: 'action',
              element: actionChild,
              props: actionChild.props
            });
          }
        });
      }
      // Handle TabGroup children
      else if (child.type && child.type.displayName === 'TabGroup') {
        React.Children.forEach(child.props.children, (tabChild) => {
          if (tabChild && tabChild.type) {
            items.push({
              type: 'tab',
              element: tabChild,
              props: tabChild.props
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
      // Handle regular buttons and elements
      else {
        items.push({
          type: 'action',
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
    
    // Safety check: only allow interaction at responsive breakpoints
    if (!isResponsiveBreakpoint()) {
      return;
    }
    
    const newState = !isOpen;
    setIsOpen(newState);
    
    // Reset positioning state when closing
    if (!newState) {
      setIsPositioned(false);
      setDropdownStyle({});
    }
  };

  return (
    <div 
      className={`responsive-page-settings ${className} ${isInitialized ? 'initialized' : 'initializing'}`}
      data-layout-stable={isInitialized ? 'true' : 'false'}
    >
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
                <X size={16} />
              </button>
            </div>
            
            <div className="dropdown-content">
              {menuItems.map((item, index) => {
                const { element, props } = item;
                
                // Extract icon and label from button children
                let icon = null;
                let label = 'Menu Item';
                
                if (props.children) {
                  const children = Array.isArray(props.children) ? props.children : [props.children];
                  
                  // Find icon (React element with size prop) and text
                  children.forEach(child => {
                    if (React.isValidElement(child) && (child.props?.size || child.type?.displayName?.includes('Icon'))) {
                      icon = child;
                    } else if (typeof child === 'string' && child.trim()) {
                      label = child.trim();
                    } else if (React.isValidElement(child) && child.props?.children && typeof child.props.children === 'string') {
                      label = child.props.children;
                    }
                  });
                }
                
                // Fallback to props
                if (!icon && props.icon) icon = props.icon;
                if (label === 'Menu Item' && props.label) label = props.label;
                if (label === 'Menu Item' && props.title) label = props.title;
                
                const onClick = props.onClick;
                const disabled = props.disabled;
                const isActive = props.isActive || props.active;
                
                return (
                  <button
                    key={index}
                    className={`menu-item ${item.type} ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => handleItemClick(item, onClick)}
                    disabled={disabled}
                    title={props.title || props.tooltip || label}
                  >
                    {icon && (
                      <span className="menu-icon">
                        {icon}
                      </span>
                    )}
                    <span className="menu-label">
                      {label}
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

export default ResponsivePageSettings;