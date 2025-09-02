// Custom hook to integrate block system with Notes
import { useState, useEffect, useRef, useCallback } from 'react';
import { BlockManager } from '../utils/blockManager';
import { NavigationController } from '../utils/navigationController';
import { DeletionController } from '../utils/deletionController';
import { DragDropController } from '../utils/dragDropController';

export const useBlockSystem = (initialContent) => {
  const [blocks, setBlocks] = useState([]);
  const [focusedBlockId, setFocusedBlockId] = useState(null);
  const blockManagerRef = useRef(null);
  const navControllerRef = useRef(null);
  const deletionControllerRef = useRef(null);
  const dragDropControllerRef = useRef(null);

  // Initialize block system
  useEffect(() => {
    if (!blockManagerRef.current) {
      blockManagerRef.current = new BlockManager();
      navControllerRef.current = new NavigationController(blockManagerRef.current);
      deletionControllerRef.current = new DeletionController(blockManagerRef.current);
      dragDropControllerRef.current = new DragDropController(blockManagerRef.current);

      // Subscribe to block changes
      const unsubscribe = blockManagerRef.current.subscribe(({ event, data, blocks }) => {
        setBlocks([...blocks]);
        if (event === 'focus') {
          setFocusedBlockId(data);
        }
      });

      // Listen for reorder events
      const handleReorder = () => {
        setBlocks([...blockManagerRef.current.getAllBlocks()]);
      };
      document.addEventListener('blocksReordered', handleReorder);

      return () => {
        unsubscribe();
        document.removeEventListener('blocksReordered', handleReorder);
        navControllerRef.current?.destroy();
        dragDropControllerRef.current?.destroy();
      };
    }
  }, []);

  // Convert existing content to blocks
  useEffect(() => {
    if (initialContent && blockManagerRef.current) {
      const initialBlocks = convertContentToBlocks(initialContent);
      blockManagerRef.current.initialize(initialBlocks);
    }
  }, [initialContent]);

  // Insert new block
  const insertBlock = useCallback((blockData, position = 'current') => {
    if (blockManagerRef.current) {
      const newBlock = blockManagerRef.current.insertBlock(blockData, position);
      return newBlock;
    }
  }, []);

  // Update block
  const updateBlock = useCallback((blockId, updates) => {
    if (blockManagerRef.current) {
      blockManagerRef.current.updateBlock(blockId, updates);
    }
  }, []);

  // Delete block
  const deleteBlock = useCallback((blockId) => {
    const event = new CustomEvent('deleteBlock', { 
      detail: { blockId } 
    });
    document.dispatchEvent(event);
  }, []);

  // Move block up
  const moveBlockUp = useCallback((blockId) => {
    if (blockManagerRef.current) {
      blockManagerRef.current.moveBlockUp(blockId);
    }
  }, []);

  // Move block down
  const moveBlockDown = useCallback((blockId) => {
    if (blockManagerRef.current) {
      blockManagerRef.current.moveBlockDown(blockId);
    }
  }, []);

  // Duplicate block
  const duplicateBlock = useCallback((blockId) => {
    if (blockManagerRef.current) {
      return blockManagerRef.current.duplicateBlock(blockId);
    }
  }, []);

  // Copy block
  const copyBlock = useCallback((blockId) => {
    if (blockManagerRef.current) {
      blockManagerRef.current.copyBlock(blockId);
    }
  }, []);

  // Cut block
  const cutBlock = useCallback((blockId) => {
    if (blockManagerRef.current) {
      blockManagerRef.current.cutBlock(blockId);
    }
  }, []);

  // Focus block
  const focusBlock = useCallback((blockId) => {
    if (navControllerRef.current) {
      navControllerRef.current.focusBlock(blockId);
    }
  }, []);

  // Get content as HTML (for saving)
  const getContentAsHtml = useCallback(() => {
    return convertBlocksToHtml(blocks);
  }, [blocks]);

  // Get content as blocks (for Firebase)
  const getContentAsBlocks = useCallback(() => {
    if (blockManagerRef.current) {
      return blockManagerRef.current.exportBlocks();
    }
    return [];
  }, []);

  // Import blocks from saved data
  const importBlocks = useCallback((savedBlocks) => {
    if (blockManagerRef.current && savedBlocks) {
      blockManagerRef.current.importBlocks(savedBlocks);
    }
  }, []);

  return {
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
  };
};

// Convert HTML content to blocks
function convertContentToBlocks(htmlContent) {
  if (!htmlContent) return [];
  
  const blocks = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const elements = doc.body.children;
  
  let order = 1;
  
  for (let element of elements) {
    const block = convertElementToBlock(element, order);
    if (block) {
      blocks.push(block);
      order++;
    }
  }
  
  // If no blocks created, create a single text block with all content
  if (blocks.length === 0 && htmlContent) {
    blocks.push({
      id: `block-${Date.now()}`,
      type: 'text',
      content: htmlContent,
      order: 1
    });
  }
  
  return blocks;
}

// Convert DOM element to block
function convertElementToBlock(element, order) {
  const id = `block-${Date.now()}-${order}`;
  
  // Check for banner elements
  if (element.classList.contains('content-banner-item')) {
    const bannerText = element.querySelector('.banner-text')?.textContent || '';
    const isCallout = element.classList.contains('callout-banner');
    const isTitle = element.classList.contains('title-banner');
    let color = 'blue';
    
    if (element.classList.contains('banner-orange')) color = 'orange';
    else if (element.classList.contains('banner-green') || element.classList.contains('done')) color = 'green';
    else if (element.classList.contains('grey')) color = 'grey';
    
    return {
      id,
      type: isCallout ? 'callout' : isTitle ? 'title' : 'banner',
      content: {
        text: bannerText,
        color: color,
        isCallout,
        isTitle
      },
      order
    };
  }
  
  // Check for tables
  if (element.tagName === 'TABLE') {
    return {
      id,
      type: 'table',
      content: {
        html: element.outerHTML,
        rows: element.querySelectorAll('tr').length,
        columns: element.querySelector('tr')?.querySelectorAll('td, th').length || 0
      },
      order
    };
  }
  
  // Check for images
  if (element.tagName === 'IMG') {
    return {
      id,
      type: 'image',
      content: {
        src: element.src,
        alt: element.alt || ''
      },
      order
    };
  }
  
  // Default to text block
  return {
    id,
    type: 'text',
    content: element.innerHTML,
    order
  };
}

// Convert blocks back to HTML
function convertBlocksToHtml(blocks) {
  if (!blocks || blocks.length === 0) return '';
  
  return blocks.map(block => {
    switch (block.type) {
      case 'text':
        return block.content || '';
      
      case 'banner':
      case 'callout':
      case 'title':
        const bannerClass = block.type === 'callout' ? 'callout-banner' : 
                           block.type === 'title' ? 'title-banner' : 
                           `banner-${block.content?.color || 'blue'}`;
        return `<div class="content-banner-item ${bannerClass}">
          <span class="banner-text">${block.content?.text || ''}</span>
        </div>`;
      
      case 'table':
        return block.content?.html || '';
      
      case 'image':
        return `<img src="${block.content?.src}" alt="${block.content?.alt || ''}" />`;
      
      default:
        return '';
    }
  }).join('\n');
}