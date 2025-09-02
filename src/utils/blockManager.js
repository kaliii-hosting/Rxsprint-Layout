// Block Manager - Unified content management system for Notes
export class BlockManager {
  constructor() {
    this.blocks = [];
    this.listeners = new Set();
    this.focusedBlockId = null;
    this.clipboard = null;
  }

  // Initialize with existing content
  initialize(blocks = []) {
    this.blocks = blocks.map((block, index) => ({
      ...block,
      id: block.id || this.generateId(),
      order: block.order || index + 1,
      createdAt: block.createdAt || new Date().toISOString(),
      metadata: {
        editable: true,
        deletable: true,
        ...block.metadata
      }
    }));
    this.sortBlocks();
    this.notifyListeners();
  }

  // Generate unique block ID
  generateId() {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Insert new block at current position or end
  insertBlock(blockData, position = 'current') {
    const newBlock = {
      id: this.generateId(),
      type: blockData.type || 'text',
      content: blockData.content || '',
      order: this.getInsertOrder(position, blockData.afterBlockId),
      createdAt: new Date().toISOString(),
      metadata: {
        editable: true,
        deletable: true,
        ...blockData.metadata
      }
    };

    // Handle specific block types
    switch (newBlock.type) {
      case 'banner':
        newBlock.content = {
          text: blockData.text || '',
          color: blockData.color || 'blue',
          isTitle: blockData.isTitle || false,
          isCallout: blockData.isCallout || false,
          newLine: blockData.newLine || false
        };
        break;
      case 'table':
        newBlock.content = {
          data: blockData.data || [],
          rows: blockData.rows || 0,
          columns: blockData.columns || 0,
          hasHeaders: blockData.hasHeaders || true
        };
        break;
      case 'image':
        newBlock.content = {
          src: blockData.src || '',
          alt: blockData.alt || '',
          caption: blockData.caption || ''
        };
        break;
    }

    // Reorder subsequent blocks if inserting in middle
    if (position === 'current' || position === 'after') {
      this.shiftBlocksDown(newBlock.order);
    }

    this.blocks.push(newBlock);
    this.sortBlocks();
    this.focusBlock(newBlock.id);
    this.notifyListeners();

    return newBlock;
  }

  // Get insertion order based on position
  getInsertOrder(position, afterBlockId) {
    if (position === 'end') {
      return this.blocks.length + 1;
    }

    if (afterBlockId) {
      const targetBlock = this.getBlock(afterBlockId);
      if (targetBlock) {
        return targetBlock.order + 0.5;
      }
    }

    // Insert after currently focused block
    if (this.focusedBlockId) {
      const currentBlock = this.getBlock(this.focusedBlockId);
      if (currentBlock) {
        return currentBlock.order + 0.5;
      }
    }

    return this.blocks.length + 1;
  }

  // Shift blocks down to make room for insertion
  shiftBlocksDown(fromOrder) {
    this.blocks.forEach(block => {
      if (block.order >= fromOrder) {
        block.order += 1;
      }
    });
  }

  // Sort blocks by order and normalize order numbers
  sortBlocks() {
    this.blocks.sort((a, b) => a.order - b.order);
    this.blocks.forEach((block, index) => {
      block.order = index + 1;
    });
  }

  // Get block by ID
  getBlock(blockId) {
    return this.blocks.find(block => block.id === blockId);
  }

  // Get previous block
  getPreviousBlock(blockId) {
    const currentBlock = this.getBlock(blockId);
    if (!currentBlock) return null;
    
    const prevBlocks = this.blocks.filter(b => b.order < currentBlock.order);
    return prevBlocks[prevBlocks.length - 1] || null;
  }

  // Get next block
  getNextBlock(blockId) {
    const currentBlock = this.getBlock(blockId);
    if (!currentBlock) return null;
    
    return this.blocks.find(b => b.order === currentBlock.order + 1) || null;
  }

  // Update block content
  updateBlock(blockId, updates) {
    const block = this.getBlock(blockId);
    if (!block) return;

    Object.assign(block, updates);
    block.updatedAt = new Date().toISOString();
    this.notifyListeners();
  }

  // Remove block
  removeBlock(blockId) {
    const blockIndex = this.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return null;

    const removedBlock = this.blocks.splice(blockIndex, 1)[0];
    this.sortBlocks();
    
    // Focus next available block
    if (this.focusedBlockId === blockId) {
      const nextBlock = this.blocks[blockIndex] || this.blocks[blockIndex - 1];
      if (nextBlock) {
        this.focusBlock(nextBlock.id);
      }
    }
    
    this.notifyListeners();
    return removedBlock;
  }

  // Move block to new position
  moveBlock(blockId, targetBlockId, position = 'after') {
    const block = this.getBlock(blockId);
    const targetBlock = this.getBlock(targetBlockId);
    
    if (!block || !targetBlock || blockId === targetBlockId) return;

    // Calculate new order
    let newOrder;
    if (position === 'before') {
      newOrder = targetBlock.order - 0.5;
    } else {
      newOrder = targetBlock.order + 0.5;
    }

    block.order = newOrder;
    this.sortBlocks();
    this.notifyListeners();
  }

  // Move block up
  moveBlockUp(blockId) {
    const block = this.getBlock(blockId);
    if (!block || block.order === 1) return;

    const prevBlock = this.getPreviousBlock(blockId);
    if (prevBlock) {
      const tempOrder = block.order;
      block.order = prevBlock.order;
      prevBlock.order = tempOrder;
      this.sortBlocks();
      this.notifyListeners();
    }
  }

  // Move block down
  moveBlockDown(blockId) {
    const block = this.getBlock(blockId);
    if (!block || block.order === this.blocks.length) return;

    const nextBlock = this.getNextBlock(blockId);
    if (nextBlock) {
      const tempOrder = block.order;
      block.order = nextBlock.order;
      nextBlock.order = tempOrder;
      this.sortBlocks();
      this.notifyListeners();
    }
  }

  // Focus a block
  focusBlock(blockId) {
    this.focusedBlockId = blockId;
    this.notifyListeners('focus', blockId);
  }

  // Get focused block
  getFocusedBlock() {
    return this.getBlock(this.focusedBlockId);
  }

  // Duplicate block
  duplicateBlock(blockId) {
    const block = this.getBlock(blockId);
    if (!block) return;

    const duplicatedBlock = {
      ...block,
      id: this.generateId(),
      order: block.order + 0.5,
      createdAt: new Date().toISOString()
    };

    this.blocks.push(duplicatedBlock);
    this.sortBlocks();
    this.focusBlock(duplicatedBlock.id);
    this.notifyListeners();
    
    return duplicatedBlock;
  }

  // Copy block to clipboard
  copyBlock(blockId) {
    const block = this.getBlock(blockId);
    if (block) {
      this.clipboard = { ...block };
    }
  }

  // Cut block (copy and remove)
  cutBlock(blockId) {
    this.copyBlock(blockId);
    this.removeBlock(blockId);
  }

  // Paste block from clipboard
  pasteBlock(position = 'current') {
    if (!this.clipboard) return;

    const pastedBlock = {
      ...this.clipboard,
      id: this.generateId(),
      order: this.getInsertOrder(position),
      createdAt: new Date().toISOString()
    };

    this.blocks.push(pastedBlock);
    this.sortBlocks();
    this.focusBlock(pastedBlock.id);
    this.notifyListeners();
    
    return pastedBlock;
  }

  // Check if block is empty
  isBlockEmpty(block) {
    if (!block) return true;

    switch (block.type) {
      case 'text':
        return !block.content || 
               block.content === '<p></p>' || 
               block.content.replace(/<[^>]*>/g, '').trim() === '';
      case 'banner':
      case 'callout':
      case 'title':
        return !block.content?.text?.trim();
      case 'table':
        return !block.content?.data || block.content.data.length === 0;
      case 'image':
        return !block.content?.src;
      default:
        return !block.content;
    }
  }

  // Get all blocks
  getAllBlocks() {
    return [...this.blocks];
  }

  // Clear all blocks
  clearAll() {
    this.blocks = [];
    this.focusedBlockId = null;
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners of changes
  notifyListeners(event = 'change', data = null) {
    this.listeners.forEach(listener => {
      listener({ event, data, blocks: this.getAllBlocks() });
    });
  }

  // Export blocks for saving
  exportBlocks() {
    return this.blocks.map(block => ({
      id: block.id,
      type: block.type,
      content: block.content,
      order: block.order,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
      metadata: block.metadata
    }));
  }

  // Import blocks from saved data
  importBlocks(blocks) {
    this.initialize(blocks);
  }
}

// Create singleton instance
export const blockManager = new BlockManager();