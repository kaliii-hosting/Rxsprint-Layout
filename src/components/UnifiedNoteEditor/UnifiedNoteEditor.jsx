import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBlockSystem } from '../../hooks/useBlockSystem';
import BlockWrapper from '../BlockWrapper/BlockWrapper';
import BlockRenderer from '../BlockRenderer/BlockRenderer';
import EnhancedRichTextEditor from '../EnhancedRichTextEditor/EnhancedRichTextEditor';
import { Plus, Type, Table, Image, MessageSquare, Code, List } from 'lucide-react';
import './UnifiedNoteEditor.css';

const UnifiedNoteEditor = ({ 
  content, 
  onChange, 
  onImageUpload, 
  readOnly = false,
  banners = [],
  onBannersChange
}) => {
  const {
    blocks,
    focusedBlockId,
    insertBlock,
    updateBlock,
    deleteBlock,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    copyBlock,
    cutBlock,
    focusBlock,
    getContentAsHtml,
    getContentAsBlocks,
    importBlocks
  } = useBlockSystem(content);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [insertPosition, setInsertPosition] = useState('end');
  const addMenuRef = useRef(null);

  // Initialize blocks from content and banners
  useEffect(() => {
    if (content || banners?.length > 0) {
      const combinedContent = combineContentAndBanners(content, banners);
      importBlocks(combinedContent);
    }
  }, []);

  // Update parent when blocks change
  useEffect(() => {
    if (onChange && blocks.length > 0) {
      const htmlContent = getContentAsHtml();
      onChange(htmlContent);
    }
  }, [blocks, onChange, getContentAsHtml]);

  // Handle block updates
  const handleBlockUpdate = useCallback((blockId, updates) => {
    updateBlock(blockId, updates);
  }, [updateBlock]);

  // Handle block insertion
  const handleInsertBlock = useCallback((blockData, position) => {
    const newBlock = insertBlock(blockData, position);
    if (newBlock) {
      focusBlock(newBlock.id);
    }
    setShowAddMenu(false);
  }, [insertBlock, focusBlock]);

  // Handle image upload for blocks
  const handleBlockImageUpload = useCallback(async (file, isPaste = false) => {
    if (onImageUpload) {
      const url = await onImageUpload(file, isPaste);
      if (url) {
        handleInsertBlock({
          type: 'image',
          content: { src: url, alt: 'Uploaded image' }
        }, 'current');
      }
      return url;
    }
  }, [onImageUpload, handleInsertBlock]);

  // Handle edit action
  const handleEdit = useCallback((blockId) => {
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockElement) {
      const editableElement = blockElement.querySelector('[contenteditable], textarea, input');
      if (editableElement) {
        editableElement.focus();
      }
    }
  }, []);

  // Show add menu at position
  const showAddMenuAt = useCallback((position) => {
    setInsertPosition(position);
    setShowAddMenu(true);
  }, []);

  // Close add menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  if (readOnly) {
    // Read-only view
    return (
      <div className="unified-note-viewer">
        {blocks.map((block) => (
          <div key={block.id} className="block-viewer-item">
            <BlockRenderer 
              block={block}
              readOnly={true}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="unified-note-editor">
      {/* Blocks Container */}
      <div className="blocks-container">
        {blocks.length === 0 ? (
          <div className="empty-state">
            <p>Start writing or add content blocks...</p>
            <button 
              className="add-first-block-btn"
              onClick={() => handleInsertBlock({ type: 'text', content: '<p></p>' }, 'end')}
            >
              <Plus size={20} /> Add Text Block
            </button>
          </div>
        ) : (
          blocks.map((block) => (
            <BlockWrapper
              key={block.id}
              block={block}
              isFocused={focusedBlockId === block.id}
              onDelete={deleteBlock}
              onMoveUp={() => moveBlockUp(block.id)}
              onMoveDown={() => moveBlockDown(block.id)}
              onDuplicate={() => duplicateBlock(block.id)}
              onCopy={() => copyBlock(block.id)}
              onCut={() => cutBlock(block.id)}
              onEdit={() => handleEdit(block.id)}
            >
              {block.type === 'text' ? (
                <EnhancedRichTextEditor
                  blockId={block.id}
                  value={block.content}
                  onChange={(content) => handleBlockUpdate(block.id, { content })}
                  onImageUpload={handleBlockImageUpload}
                  onInsertBlock={handleInsertBlock}
                  onFocus={focusBlock}
                  readOnly={readOnly}
                />
              ) : (
                <BlockRenderer
                  block={block}
                  onChange={handleBlockUpdate}
                  onImageUpload={handleBlockImageUpload}
                  readOnly={readOnly}
                />
              )}
            </BlockWrapper>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <button 
        className="floating-add-btn"
        onClick={() => showAddMenuAt('end')}
        title="Add new block (Ctrl+Enter)"
      >
        <Plus size={24} />
      </button>

      {/* Add Block Menu */}
      {showAddMenu && (
        <div ref={addMenuRef} className="add-block-menu">
          <div className="menu-title">Add Block</div>
          
          <button onClick={() => handleInsertBlock({ type: 'text', content: '<p></p>' }, insertPosition)}>
            <Type size={18} /> Text
          </button>
          
          <button onClick={() => handleInsertBlock({ 
            type: 'banner', 
            content: { text: '', color: 'blue' } 
          }, insertPosition)}>
            <MessageSquare size={18} /> Banner
          </button>
          
          <button onClick={() => handleInsertBlock({ 
            type: 'callout', 
            content: { text: '' } 
          }, insertPosition)}>
            <MessageSquare size={18} /> Callout
          </button>
          
          <button onClick={() => handleInsertBlock({ 
            type: 'title', 
            content: { text: '' } 
          }, insertPosition)}>
            <Type size={18} /> Title
          </button>
          
          <button onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
              const file = e.target.files[0];
              if (file) {
                await handleBlockImageUpload(file);
              }
            };
            input.click();
          }}>
            <Image size={18} /> Image
          </button>
          
          <button onClick={() => handleInsertBlock({ 
            type: 'table',
            content: { 
              html: '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>',
              rows: 2,
              columns: 2
            }
          }, insertPosition)}>
            <Table size={18} /> Table
          </button>
          
          <button onClick={() => handleInsertBlock({ 
            type: 'code',
            content: { code: '', language: 'javascript' }
          }, insertPosition)}>
            <Code size={18} /> Code
          </button>
          
          <button onClick={() => handleInsertBlock({ 
            type: 'list',
            content: { items: ['Item 1', 'Item 2'], ordered: false }
          }, insertPosition)}>
            <List size={18} /> List
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to combine content and banners
function combineContentAndBanners(htmlContent, banners) {
  const blocks = [];
  let order = 1;

  // Add banners first if they exist
  if (banners && banners.length > 0) {
    banners.forEach(banner => {
      blocks.push({
        id: banner.id || `banner-${Date.now()}-${order}`,
        type: banner.isCallout ? 'callout' : banner.isTitle ? 'title' : 'banner',
        content: {
          text: banner.text,
          color: banner.color || 'blue',
          newLine: banner.newLine,
          isDone: banner.isDone
        },
        order: order++
      });
    });
  }

  // Parse HTML content
  if (htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Check if content has block structure already
    const existingBanners = doc.querySelectorAll('.content-banner-item');
    if (existingBanners.length === 0) {
      // No banners in content, add as text block
      blocks.push({
        id: `text-${Date.now()}`,
        type: 'text',
        content: htmlContent,
        order: order++
      });
    } else {
      // Content has mixed blocks, parse them
      // This is handled by the useBlockSystem hook
    }
  }

  return blocks;
}

export default UnifiedNoteEditor;