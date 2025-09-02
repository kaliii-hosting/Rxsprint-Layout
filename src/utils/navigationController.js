// Navigation Controller - Keyboard and mouse navigation for blocks
export class NavigationController {
  constructor(blockManager) {
    this.blockManager = blockManager;
    this.currentFocus = null;
    this.isNavigating = false;
    this.keyHandlers = new Map();
    this.setupKeyboardListeners();
    this.setupMouseListeners();
  }

  setupKeyboardListeners() {
    // Main keyboard event handler
    this.keyboardHandler = (e) => {
      // Skip if user is typing in an input/textarea (unless it's a block control)
      const target = e.target;
      const isTyping = (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) && !target.classList.contains('block-control');

      // Arrow key navigation between blocks (Ctrl + Arrow)
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.focusPreviousBlock();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.focusNextBlock();
        } else if (e.key === 'd' || e.key === 'D') {
          // Ctrl+D to delete
          e.preventDefault();
          this.deleteCurrentBlock();
        }
      }
      
      // Move block up/down (Alt + Arrow)
      else if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveBlockUp();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveBlockDown();
        }
      }
      
      // Tab navigation within tables
      else if (e.key === 'Tab' && this.getCurrentBlockType() === 'table') {
        // Let table handle its own tab navigation
        // Just prevent default browser tab behavior
        if (!isTyping) {
          e.preventDefault();
          this.navigateTableCells(e.shiftKey ? 'prev' : 'next');
        }
      }
      
      // Escape to exit block editing
      else if (e.key === 'Escape') {
        this.exitBlockEdit();
      }
      
      // Enter to edit block (when focused but not editing)
      else if (e.key === 'Enter' && !isTyping) {
        const focusedElement = document.activeElement;
        if (focusedElement?.classList.contains('block-wrapper')) {
          e.preventDefault();
          this.enterEditMode(focusedElement);
        }
      }

      // Copy/Cut/Paste shortcuts
      else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && !isTyping) {
          this.copyCurrentBlock();
        } else if (e.key === 'x' && !isTyping) {
          e.preventDefault();
          this.cutCurrentBlock();
        } else if (e.key === 'v' && !isTyping && this.blockManager.clipboard) {
          e.preventDefault();
          this.pasteBlock();
        }
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  setupMouseListeners() {
    // Click to focus block
    this.clickHandler = (e) => {
      const blockElement = e.target.closest('[data-block-id]');
      if (blockElement && !e.target.closest('.block-controls')) {
        this.focusBlock(blockElement.dataset.blockId);
      }
    };

    // Right-click context menu
    this.contextMenuHandler = (e) => {
      const blockElement = e.target.closest('[data-block-id]');
      if (blockElement && !e.target.closest('.block-controls')) {
        e.preventDefault();
        this.showBlockContextMenu(blockElement, e.clientX, e.clientY);
      }
    };

    // Double-click to edit
    this.dblClickHandler = (e) => {
      const blockElement = e.target.closest('[data-block-id]');
      if (blockElement && !e.target.closest('.block-controls')) {
        this.enterEditMode(blockElement);
      }
    };

    document.addEventListener('click', this.clickHandler);
    document.addEventListener('contextmenu', this.contextMenuHandler);
    document.addEventListener('dblclick', this.dblClickHandler);
  }

  // Focus previous block
  focusPreviousBlock() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (!currentBlock) {
      // Focus first block if none focused
      const blocks = this.blockManager.getAllBlocks();
      if (blocks.length > 0) {
        this.focusBlock(blocks[0].id);
      }
      return;
    }

    const prevBlock = this.blockManager.getPreviousBlock(currentBlock.id);
    if (prevBlock) {
      this.focusBlock(prevBlock.id);
    }
  }

  // Focus next block
  focusNextBlock() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (!currentBlock) {
      // Focus first block if none focused
      const blocks = this.blockManager.getAllBlocks();
      if (blocks.length > 0) {
        this.focusBlock(blocks[0].id);
      }
      return;
    }

    const nextBlock = this.blockManager.getNextBlock(currentBlock.id);
    if (nextBlock) {
      this.focusBlock(nextBlock.id);
    }
  }

  // Focus a specific block
  focusBlock(blockId) {
    // Remove previous focus
    document.querySelectorAll('.block-focused').forEach(el => {
      el.classList.remove('block-focused');
    });

    // Add focus to target block
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockElement) {
      blockElement.classList.add('block-focused');
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Set appropriate focus based on block type
      this.setBlockFocus(blockElement);
    }

    this.blockManager.focusBlock(blockId);
    this.currentFocus = blockId;
  }

  // Set focus within block based on type
  setBlockFocus(blockElement) {
    const blockType = blockElement.dataset.blockType;

    switch(blockType) {
      case 'text':
        // Focus the editor content
        const editor = blockElement.querySelector('.ProseMirror');
        if (editor) {
          editor.focus();
          // Place cursor at end
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        break;

      case 'table':
        // Focus first cell or last edited cell
        const firstCell = blockElement.querySelector('td:first-child, th:first-child');
        if (firstCell) {
          firstCell.focus();
          firstCell.setAttribute('tabindex', '0');
        }
        break;

      case 'banner':
      case 'callout':
      case 'title':
        // Focus the text content for editing
        const textElement = blockElement.querySelector('.banner-text');
        if (textElement) {
          textElement.setAttribute('contenteditable', 'true');
          textElement.focus();
        }
        break;

      case 'image':
        // Focus the image container
        blockElement.setAttribute('tabindex', '0');
        blockElement.focus();
        break;

      default:
        // Generic focus
        blockElement.setAttribute('tabindex', '0');
        blockElement.focus();
    }
  }

  // Enter edit mode for a block
  enterEditMode(blockElement) {
    const blockType = blockElement.dataset.blockType;
    blockElement.classList.add('editing');

    switch(blockType) {
      case 'banner':
      case 'callout':
      case 'title':
        const textElement = blockElement.querySelector('.banner-text');
        if (textElement) {
          textElement.setAttribute('contenteditable', 'true');
          textElement.focus();
          
          // Select all text for easy editing
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(textElement);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        break;

      case 'text':
        const editor = blockElement.querySelector('.ProseMirror');
        if (editor) {
          editor.focus();
        }
        break;

      case 'table':
        // Enable table editing
        const cells = blockElement.querySelectorAll('td, th');
        cells.forEach(cell => {
          cell.setAttribute('contenteditable', 'true');
          cell.setAttribute('tabindex', '0');
        });
        if (cells.length > 0) {
          cells[0].focus();
        }
        break;
    }
  }

  // Exit edit mode
  exitBlockEdit() {
    const editingBlock = document.querySelector('.block-wrapper.editing');
    if (editingBlock) {
      editingBlock.classList.remove('editing');
      
      // Remove contenteditable from elements
      const editableElements = editingBlock.querySelectorAll('[contenteditable="true"]');
      editableElements.forEach(el => {
        if (!el.classList.contains('ProseMirror')) {
          el.removeAttribute('contenteditable');
        }
      });
      
      // Focus the block wrapper
      editingBlock.focus();
    }
  }

  // Get current block type
  getCurrentBlockType() {
    const currentBlock = this.blockManager.getFocusedBlock();
    return currentBlock?.type || null;
  }

  // Navigate table cells
  navigateTableCells(direction) {
    const focusedCell = document.activeElement;
    if (!focusedCell || (focusedCell.tagName !== 'TD' && focusedCell.tagName !== 'TH')) {
      return;
    }

    const row = focusedCell.parentElement;
    const table = row.parentElement.parentElement;
    const cellIndex = Array.from(row.cells).indexOf(focusedCell);
    const rowIndex = Array.from(table.rows).indexOf(row);

    if (direction === 'next') {
      // Move to next cell
      if (cellIndex < row.cells.length - 1) {
        row.cells[cellIndex + 1].focus();
      } else if (rowIndex < table.rows.length - 1) {
        // Move to first cell of next row
        table.rows[rowIndex + 1].cells[0].focus();
      }
    } else {
      // Move to previous cell
      if (cellIndex > 0) {
        row.cells[cellIndex - 1].focus();
      } else if (rowIndex > 0) {
        // Move to last cell of previous row
        const prevRow = table.rows[rowIndex - 1];
        prevRow.cells[prevRow.cells.length - 1].focus();
      }
    }
  }

  // Delete current block
  deleteCurrentBlock() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (currentBlock) {
      // Trigger deletion through event to allow for confirmation
      const event = new CustomEvent('deleteBlock', { 
        detail: { blockId: currentBlock.id } 
      });
      document.dispatchEvent(event);
    }
  }

  // Move current block up
  moveBlockUp() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (currentBlock) {
      this.blockManager.moveBlockUp(currentBlock.id);
      this.focusBlock(currentBlock.id);
    }
  }

  // Move current block down
  moveBlockDown() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (currentBlock) {
      this.blockManager.moveBlockDown(currentBlock.id);
      this.focusBlock(currentBlock.id);
    }
  }

  // Copy current block
  copyCurrentBlock() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (currentBlock) {
      this.blockManager.copyBlock(currentBlock.id);
      this.showNotification('Block copied');
    }
  }

  // Cut current block
  cutCurrentBlock() {
    const currentBlock = this.blockManager.getFocusedBlock();
    if (currentBlock) {
      this.blockManager.cutBlock(currentBlock.id);
      this.showNotification('Block cut');
    }
  }

  // Paste block
  pasteBlock() {
    const pastedBlock = this.blockManager.pasteBlock();
    if (pastedBlock) {
      this.focusBlock(pastedBlock.id);
      this.showNotification('Block pasted');
    }
  }

  // Show context menu
  showBlockContextMenu(blockElement, x, y) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.block-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const blockId = blockElement.dataset.blockId;
    const menu = document.createElement('div');
    menu.className = 'block-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.zIndex = '10000';

    menu.innerHTML = `
      <div class="context-menu-item" data-action="edit">Edit</div>
      <div class="context-menu-item" data-action="delete">Delete</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="moveUp">Move Up</div>
      <div class="context-menu-item" data-action="moveDown">Move Down</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="duplicate">Duplicate</div>
      <div class="context-menu-item" data-action="copy">Copy</div>
      <div class="context-menu-item" data-action="cut">Cut</div>
      ${this.blockManager.clipboard ? '<div class="context-menu-item" data-action="paste">Paste</div>' : ''}
    `;

    // Handle menu item clicks
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextMenuAction(action, blockId, blockElement);
        menu.remove();
      }
    });

    // Close menu on outside click
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);

    document.body.appendChild(menu);
  }

  // Handle context menu actions
  handleContextMenuAction(action, blockId, blockElement) {
    switch(action) {
      case 'edit':
        this.enterEditMode(blockElement);
        break;
      case 'delete':
        const event = new CustomEvent('deleteBlock', { 
          detail: { blockId } 
        });
        document.dispatchEvent(event);
        break;
      case 'moveUp':
        this.blockManager.moveBlockUp(blockId);
        this.focusBlock(blockId);
        break;
      case 'moveDown':
        this.blockManager.moveBlockDown(blockId);
        this.focusBlock(blockId);
        break;
      case 'duplicate':
        const duplicated = this.blockManager.duplicateBlock(blockId);
        if (duplicated) {
          this.focusBlock(duplicated.id);
        }
        break;
      case 'copy':
        this.blockManager.copyBlock(blockId);
        this.showNotification('Block copied');
        break;
      case 'cut':
        this.blockManager.cutBlock(blockId);
        this.showNotification('Block cut');
        break;
      case 'paste':
        const pasted = this.blockManager.pasteBlock('after');
        if (pasted) {
          this.focusBlock(pasted.id);
        }
        break;
    }
  }

  // Show notification
  showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'block-notification';
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

  // Cleanup
  destroy() {
    document.removeEventListener('keydown', this.keyboardHandler);
    document.removeEventListener('click', this.clickHandler);
    document.removeEventListener('contextmenu', this.contextMenuHandler);
    document.removeEventListener('dblclick', this.dblClickHandler);
  }
}