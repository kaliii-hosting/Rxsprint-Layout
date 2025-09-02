import React, { useState, useEffect, useRef } from 'react';
import { 
  GripVertical, 
  X, 
  MoreVertical, 
  Copy, 
  Scissors, 
  Clipboard,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit
} from 'lucide-react';
import './BlockWrapper.css';

const BlockWrapper = ({ 
  block, 
  children, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  onDuplicate,
  onCopy,
  onCut,
  onEdit,
  isFocused,
  isSelectionMode,
  isSelected,
  onSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const blockRef = useRef(null);
  const menuRef = useRef(null);

  // Handle focus changes
  useEffect(() => {
    if (isFocused && blockRef.current) {
      blockRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFocused]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Get block type icon/label
  const getBlockTypeLabel = () => {
    switch(block.type) {
      case 'text': return 'Text';
      case 'table': return 'Table';
      case 'image': return 'Image';
      case 'banner': return 'Banner';
      case 'callout': return 'Callout';
      case 'title': return 'Title';
      default: return 'Block';
    }
  };

  // Get block color for visual indicator
  const getBlockColor = () => {
    switch(block.type) {
      case 'banner': 
        return block.content?.color || 'blue';
      case 'callout':
        return 'callout';
      case 'title':
        return 'title';
      default:
        return 'default';
    }
  };

  const handleDragStart = (e) => {
    // Drag is initiated from the handle
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
  };

  return (
    <div 
      ref={blockRef}
      className={`
        block-wrapper 
        ${block.type}-block 
        ${isFocused ? 'focused' : ''} 
        ${isHovered ? 'hovered' : ''}
        ${isEditing ? 'editing' : ''}
        ${isSelected ? 'selected' : ''}
        block-color-${getBlockColor()}
      `}
      data-block-id={block.id}
      data-block-type={block.type}
      data-block-order={block.order}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => {}}
      onBlur={() => setIsEditing(false)}
      tabIndex={0}
    >
      {/* Block Controls - Show on hover/focus */}
      {(isHovered || isFocused) && !isEditing && (
        <div className="block-controls">
          {/* Drag Handle */}
          <button 
            className="block-handle"
            title="Drag to reorder"
            draggable
            onDragStart={handleDragStart}
            onMouseDown={(e) => e.preventDefault()}
          >
            <GripVertical size={16} />
          </button>
          
          {/* Block Type Indicator */}
          <span className="block-type-indicator">
            {getBlockTypeLabel()}
          </span>
          
          {/* Quick Actions */}
          <div className="block-quick-actions">
            {/* Move Up */}
            <button 
              className="block-action-btn"
              title="Move up (Alt+↑)"
              onClick={onMoveUp}
              disabled={block.order === 1}
            >
              <ArrowUp size={14} />
            </button>
            
            {/* Move Down */}
            <button 
              className="block-action-btn"
              title="Move down (Alt+↓)"
              onClick={onMoveDown}
            >
              <ArrowDown size={14} />
            </button>
            
            {/* Delete */}
            <button 
              className="block-action-btn block-delete"
              title="Delete (Ctrl+D)"
              onClick={() => onDelete(block.id)}
            >
              <X size={16} />
            </button>
            
            {/* More Options Menu */}
            <div className="block-menu-container">
              <button 
                className="block-action-btn"
                title="More options"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical size={14} />
              </button>
              
              {showMenu && (
                <div ref={menuRef} className="block-dropdown-menu">
                  <button onClick={() => { onEdit(); setShowMenu(false); }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => { onDuplicate(); setShowMenu(false); }}>
                    <Copy size={14} /> Duplicate
                  </button>
                  <button onClick={() => { onCopy(); setShowMenu(false); }}>
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={() => { onCut(); setShowMenu(false); }}>
                    <Scissors size={14} /> Cut
                  </button>
                  <div className="menu-separator" />
                  <button 
                    className="delete-option"
                    onClick={() => { onDelete(block.id); setShowMenu(false); }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Block Order Number (subtle indicator) */}
      {(isHovered || isFocused) && (
        <div className="block-order-indicator">
          {block.order}
        </div>
      )}
      
      {/* Main Content */}
      <div className="block-content">
        {children}
      </div>
      
      {/* Focus Ring */}
      {isFocused && <div className="focus-ring" />}
      
      {/* Selection Checkbox for bulk operations */}
      {isSelectionMode && (
        <input 
          type="checkbox"
          className="block-select"
          checked={isSelected}
          onChange={(e) => onSelect(block.id, e.target.checked)}
        />
      )}
    </div>
  );
};

export default BlockWrapper;