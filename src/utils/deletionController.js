// Deletion Controller - Safe deletion with undo capability
export class DeletionController {
  constructor(blockManager) {
    this.blockManager = blockManager;
    this.deletedBlocks = []; // Undo stack
    this.maxUndoStack = 20; // Maximum number of deletions to remember
    this.setupDeletionHandlers();
  }

  setupDeletionHandlers() {
    // Listen for delete events
    document.addEventListener('deleteBlock', (e) => {
      const { blockId, skipConfirm } = e.detail;
      this.deleteBlock(blockId, !skipConfirm);
    });

    // Keyboard shortcut for undo
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Ctrl/Cmd + Z for undo
        const target = e.target;
        const isTyping = (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        );
        
        if (!isTyping) {
          e.preventDefault();
          this.undoDelete();
        }
      }
    });

    // Listen for clear all
    document.addEventListener('clearAllBlocks', () => {
      this.clearAll();
    });
  }

  // Delete a block with optional confirmation
  async deleteBlock(blockId, confirm = true) {
    const block = this.blockManager.getBlock(blockId);
    if (!block) return;

    // Check if block is important and needs confirmation
    if (confirm && this.isImportantBlock(block)) {
      const confirmed = await this.showConfirmDialog({
        title: 'Delete Block?',
        message: this.getDeleteMessage(block),
        confirmText: 'Delete',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;
    }

    // Store block for undo (before deletion)
    this.addToUndoStack({
      block: { ...block },
      position: block.order,
      deletedAt: new Date().toISOString()
    });

    // Remove the block
    const removedBlock = this.blockManager.removeBlock(blockId);
    
    if (removedBlock) {
      // Show undo notification
      this.showUndoNotification({
        message: `${this.getBlockTypeName(block.type)} deleted`,
        action: () => this.undoDelete()
      });
    }
  }

  // Add to undo stack with size limit
  addToUndoStack(deletedItem) {
    this.deletedBlocks.push(deletedItem);
    
    // Maintain stack size limit
    if (this.deletedBlocks.length > this.maxUndoStack) {
      this.deletedBlocks.shift(); // Remove oldest
    }
  }

  // Undo last deletion
  undoDelete() {
    if (this.deletedBlocks.length === 0) {
      this.showNotification('Nothing to undo');
      return;
    }

    const { block, position } = this.deletedBlocks.pop();
    
    // Restore the block
    const restoredBlock = this.blockManager.insertBlock({
      ...block,
      order: position
    }, 'at');

    if (restoredBlock) {
      this.blockManager.focusBlock(restoredBlock.id);
      this.showNotification(`${this.getBlockTypeName(block.type)} restored`);
    }
  }

  // Check if block contains important content
  isImportantBlock(block) {
    switch (block.type) {
      case 'table':
        // Tables with data are important
        return block.content?.data && block.content.data.length > 0;
      
      case 'image':
        // All images are important
        return true;
      
      case 'text':
        // Long text content is important
        const textLength = block.content?.replace(/<[^>]*>/g, '').trim().length || 0;
        return textLength > 100;
      
      case 'banner':
      case 'callout':
      case 'title':
        // Banners with content are somewhat important
        return block.content?.text && block.content.text.length > 20;
      
      default:
        return false;
    }
  }

  // Get delete confirmation message based on block type
  getDeleteMessage(block) {
    switch (block.type) {
      case 'table':
        const rows = block.content?.rows || 0;
        const cols = block.content?.columns || 0;
        return `Delete this table with ${rows} rows and ${cols} columns? This action can be undone.`;
      
      case 'image':
        return 'Delete this image? This action can be undone.';
      
      case 'text':
        const words = block.content?.replace(/<[^>]*>/g, '').trim().split(/\s+/).length || 0;
        return `Delete this text block with approximately ${words} words? This action can be undone.`;
      
      case 'banner':
      case 'callout':
      case 'title':
        return `Delete this ${block.type}? This action can be undone.`;
      
      default:
        return 'Delete this block? This action can be undone.';
    }
  }

  // Get friendly block type name
  getBlockTypeName(type) {
    const names = {
      text: 'Text',
      table: 'Table',
      image: 'Image',
      banner: 'Banner',
      callout: 'Callout',
      title: 'Title'
    };
    return names[type] || 'Block';
  }

  // Show confirmation dialog
  showConfirmDialog({ title, message, confirmText, cancelText }) {
    return new Promise((resolve) => {
      // Remove any existing dialog
      const existingDialog = document.querySelector('.delete-confirm-dialog');
      if (existingDialog) {
        existingDialog.remove();
      }

      // Create dialog
      const dialog = document.createElement('div');
      dialog.className = 'delete-confirm-dialog';
      dialog.innerHTML = `
        <div class="dialog-overlay"></div>
        <div class="dialog-content">
          <h3 class="dialog-title">${title}</h3>
          <p class="dialog-message">${message}</p>
          <div class="dialog-buttons">
            <button class="dialog-btn dialog-btn-cancel">${cancelText}</button>
            <button class="dialog-btn dialog-btn-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      // Style the dialog
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Handle button clicks
      const confirmBtn = dialog.querySelector('.dialog-btn-confirm');
      const cancelBtn = dialog.querySelector('.dialog-btn-cancel');
      const overlay = dialog.querySelector('.dialog-overlay');

      confirmBtn.addEventListener('click', () => {
        dialog.remove();
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        dialog.remove();
        resolve(false);
      });

      overlay.addEventListener('click', () => {
        dialog.remove();
        resolve(false);
      });

      // Handle escape key
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          dialog.remove();
          resolve(false);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);

      document.body.appendChild(dialog);
      
      // Focus cancel button by default (safer option)
      cancelBtn.focus();
    });
  }

  // Show undo notification with action
  showUndoNotification({ message, action }) {
    // Remove any existing notification
    const existingNotif = document.querySelector('.undo-notification');
    if (existingNotif) {
      existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'undo-notification';
    notification.innerHTML = `
      <span class="notif-message">${message}</span>
      <button class="notif-undo-btn">Undo</button>
    `;

    // Style the notification
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 15px;
      z-index: 10000;
      animation: slideUp 0.3s ease;
    `;

    // Handle undo button click
    const undoBtn = notification.querySelector('.notif-undo-btn');
    undoBtn.addEventListener('click', () => {
      action();
      notification.remove();
    });

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // Show simple notification
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'simple-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Delete multiple blocks
  async deleteMultipleBlocks(blockIds, confirm = true) {
    if (confirm) {
      const confirmed = await this.showConfirmDialog({
        title: 'Delete Multiple Blocks?',
        message: `Delete ${blockIds.length} selected blocks? This action can be undone.`,
        confirmText: 'Delete All',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;
    }

    // Store all blocks for undo
    const blocksToDelete = blockIds.map(id => {
      const block = this.blockManager.getBlock(id);
      return block ? {
        block: { ...block },
        position: block.order,
        deletedAt: new Date().toISOString()
      } : null;
    }).filter(Boolean);

    if (blocksToDelete.length > 0) {
      // Add as a batch to undo stack
      this.addToUndoStack({
        batch: true,
        blocks: blocksToDelete,
        deletedAt: new Date().toISOString()
      });

      // Delete all blocks
      blockIds.forEach(id => {
        this.blockManager.removeBlock(id);
      });

      this.showUndoNotification({
        message: `${blocksToDelete.length} blocks deleted`,
        action: () => this.undoBatchDelete()
      });
    }
  }

  // Undo batch deletion
  undoBatchDelete() {
    if (this.deletedBlocks.length === 0) return;

    const lastDeleted = this.deletedBlocks[this.deletedBlocks.length - 1];
    if (lastDeleted.batch && lastDeleted.blocks) {
      this.deletedBlocks.pop();
      
      // Restore all blocks in reverse order
      lastDeleted.blocks.reverse().forEach(({ block, position }) => {
        this.blockManager.insertBlock({
          ...block,
          order: position
        }, 'at');
      });

      this.showNotification(`${lastDeleted.blocks.length} blocks restored`);
    }
  }

  // Clear all blocks with confirmation
  async clearAll() {
    const blocks = this.blockManager.getAllBlocks();
    if (blocks.length === 0) return;

    const confirmed = await this.showConfirmDialog({
      title: 'Clear All Content?',
      message: 'This will delete all blocks in the note. This action can be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    // Store all blocks for undo
    const allBlocks = blocks.map(block => ({
      block: { ...block },
      position: block.order,
      deletedAt: new Date().toISOString()
    }));

    this.addToUndoStack({
      batch: true,
      clearAll: true,
      blocks: allBlocks,
      deletedAt: new Date().toISOString()
    });

    // Clear all
    this.blockManager.clearAll();

    this.showUndoNotification({
      message: 'All content cleared',
      action: () => this.undoClearAll()
    });
  }

  // Undo clear all
  undoClearAll() {
    if (this.deletedBlocks.length === 0) return;

    const lastDeleted = this.deletedBlocks[this.deletedBlocks.length - 1];
    if (lastDeleted.clearAll && lastDeleted.blocks) {
      this.deletedBlocks.pop();
      
      // Restore all blocks
      lastDeleted.blocks.forEach(({ block }) => {
        this.blockManager.insertBlock(block, 'end');
      });

      this.showNotification('All content restored');
    }
  }

  // Get undo stack size
  getUndoCount() {
    return this.deletedBlocks.length;
  }

  // Clear undo stack
  clearUndoStack() {
    this.deletedBlocks = [];
  }
}