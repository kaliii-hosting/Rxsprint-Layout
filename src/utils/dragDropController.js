// Drag and Drop Controller - Reorder blocks with drag and drop
export class DragDropController {
  constructor(blockManager) {
    this.blockManager = blockManager;
    this.draggedBlock = null;
    this.draggedElement = null;
    this.dropIndicator = null;
    this.setupDragDrop();
  }

  setupDragDrop() {
    // Create drop indicator element
    this.createDropIndicator();

    // Drag start
    document.addEventListener('dragstart', this.handleDragStart.bind(this));
    
    // Drag over
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    
    // Drag enter
    document.addEventListener('dragenter', this.handleDragEnter.bind(this));
    
    // Drag leave
    document.addEventListener('dragleave', this.handleDragLeave.bind(this));
    
    // Drop
    document.addEventListener('drop', this.handleDrop.bind(this));
    
    // Drag end
    document.addEventListener('dragend', this.handleDragEnd.bind(this));

    // Touch support for mobile
    this.setupTouchSupport();
  }

  createDropIndicator() {
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'block-drop-indicator';
    this.dropIndicator.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: #FF6900;
      pointer-events: none;
      z-index: 9999;
      display: none;
      transition: opacity 0.2s ease;
    `;
    document.body.appendChild(this.dropIndicator);
  }

  handleDragStart(e) {
    // Check if dragging from handle
    const handle = e.target.closest('.block-handle');
    if (!handle) return;

    const blockElement = e.target.closest('[data-block-id]');
    if (!blockElement) return;

    this.draggedBlock = blockElement.dataset.blockId;
    this.draggedElement = blockElement;
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.draggedBlock);
    
    // Add dragging class
    blockElement.classList.add('dragging');
    
    // Create ghost image
    const ghostImage = blockElement.cloneNode(true);
    ghostImage.style.opacity = '0.5';
    ghostImage.style.position = 'absolute';
    ghostImage.style.top = '-1000px';
    document.body.appendChild(ghostImage);
    e.dataTransfer.setDragImage(ghostImage, e.offsetX, e.offsetY);
    setTimeout(() => ghostImage.remove(), 0);
  }

  handleDragOver(e) {
    if (!this.draggedBlock) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const blockElement = e.target.closest('[data-block-id]');
    if (!blockElement || blockElement === this.draggedElement) {
      this.hideDropIndicator();
      return;
    }
    
    const rect = blockElement.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isAbove = e.clientY < midpoint;
    
    this.showDropIndicator(blockElement, isAbove);
  }

  handleDragEnter(e) {
    if (!this.draggedBlock) return;
    
    const blockElement = e.target.closest('[data-block-id]');
    if (blockElement && blockElement !== this.draggedElement) {
      blockElement.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    if (!this.draggedBlock) return;
    
    const blockElement = e.target.closest('[data-block-id]');
    if (blockElement) {
      // Check if we're really leaving the element
      const rect = blockElement.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || 
          e.clientY < rect.top || e.clientY > rect.bottom) {
        blockElement.classList.remove('drag-over');
      }
    }
  }

  handleDrop(e) {
    if (!this.draggedBlock) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const targetBlock = e.target.closest('[data-block-id]');
    if (!targetBlock || targetBlock === this.draggedElement) {
      this.cleanupDragStyles();
      return;
    }
    
    const targetId = targetBlock.dataset.blockId;
    const rect = targetBlock.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midpoint;
    
    // Perform the move
    this.blockManager.moveBlock(
      this.draggedBlock,
      targetId,
      insertBefore ? 'before' : 'after'
    );
    
    // Clean up
    this.cleanupDragStyles();
    
    // Trigger re-render
    const event = new CustomEvent('blocksReordered', {
      detail: { movedBlock: this.draggedBlock, targetBlock: targetId }
    });
    document.dispatchEvent(event);
  }

  handleDragEnd(e) {
    this.cleanupDragStyles();
  }

  showDropIndicator(blockElement, isAbove) {
    if (!this.dropIndicator) return;
    
    const rect = blockElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    this.dropIndicator.style.display = 'block';
    this.dropIndicator.style.top = `${rect.top + scrollTop + (isAbove ? -2 : rect.height - 1)}px`;
    this.dropIndicator.style.left = `${rect.left + scrollLeft}px`;
    this.dropIndicator.style.width = `${rect.width}px`;
  }

  hideDropIndicator() {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none';
    }
  }

  cleanupDragStyles() {
    // Remove dragging class
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
    }
    
    // Remove drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    
    // Remove drop indicator classes
    document.querySelectorAll('.drop-before, .drop-after').forEach(el => {
      el.classList.remove('drop-before', 'drop-after');
    });
    
    // Hide drop indicator
    this.hideDropIndicator();
    
    // Reset state
    this.draggedBlock = null;
    this.draggedElement = null;
  }

  // Touch support for mobile devices
  setupTouchSupport() {
    let touchItem = null;
    let touchOffset = { x: 0, y: 0 };
    let touchClone = null;
    let lastTouchTarget = null;

    // Touch start
    document.addEventListener('touchstart', (e) => {
      const handle = e.target.closest('.block-handle');
      if (!handle) return;
      
      const blockElement = e.target.closest('[data-block-id]');
      if (!blockElement) return;
      
      e.preventDefault();
      
      touchItem = blockElement;
      this.draggedBlock = blockElement.dataset.blockId;
      this.draggedElement = blockElement;
      
      const touch = e.touches[0];
      const rect = blockElement.getBoundingClientRect();
      touchOffset.x = touch.clientX - rect.left;
      touchOffset.y = touch.clientY - rect.top;
      
      // Create clone for visual feedback
      touchClone = blockElement.cloneNode(true);
      touchClone.style.cssText = `
        position: fixed;
        pointer-events: none;
        opacity: 0.8;
        z-index: 10000;
        width: ${rect.width}px;
        transform: scale(1.05);
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        transition: transform 0.2s ease;
      `;
      touchClone.style.left = `${touch.clientX - touchOffset.x}px`;
      touchClone.style.top = `${touch.clientY - touchOffset.y}px`;
      document.body.appendChild(touchClone);
      
      blockElement.classList.add('dragging');
    }, { passive: false });

    // Touch move
    document.addEventListener('touchmove', (e) => {
      if (!touchItem || !touchClone) return;
      
      e.preventDefault();
      
      const touch = e.touches[0];
      
      // Update clone position
      touchClone.style.left = `${touch.clientX - touchOffset.x}px`;
      touchClone.style.top = `${touch.clientY - touchOffset.y}px`;
      
      // Find element under touch point
      touchClone.style.display = 'none';
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';
      
      const blockBelow = elementBelow?.closest('[data-block-id]');
      
      if (blockBelow && blockBelow !== touchItem) {
        // Clear previous highlight
        if (lastTouchTarget && lastTouchTarget !== blockBelow) {
          lastTouchTarget.classList.remove('drag-over');
        }
        
        blockBelow.classList.add('drag-over');
        lastTouchTarget = blockBelow;
        
        // Show drop indicator
        const rect = blockBelow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const isAbove = touch.clientY < midpoint;
        this.showDropIndicator(blockBelow, isAbove);
      } else {
        this.hideDropIndicator();
      }
    }, { passive: false });

    // Touch end
    document.addEventListener('touchend', (e) => {
      if (!touchItem || !touchClone) return;
      
      const touch = e.changedTouches[0];
      
      // Find drop target
      touchClone.style.display = 'none';
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';
      
      const blockBelow = elementBelow?.closest('[data-block-id]');
      
      if (blockBelow && blockBelow !== touchItem) {
        const targetId = blockBelow.dataset.blockId;
        const rect = blockBelow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertBefore = touch.clientY < midpoint;
        
        // Perform the move
        this.blockManager.moveBlock(
          this.draggedBlock,
          targetId,
          insertBefore ? 'before' : 'after'
        );
        
        // Trigger re-render
        const event = new CustomEvent('blocksReordered', {
          detail: { movedBlock: this.draggedBlock, targetBlock: targetId }
        });
        document.dispatchEvent(event);
      }
      
      // Clean up
      if (touchClone) {
        touchClone.remove();
        touchClone = null;
      }
      
      if (lastTouchTarget) {
        lastTouchTarget.classList.remove('drag-over');
        lastTouchTarget = null;
      }
      
      this.cleanupDragStyles();
      touchItem = null;
    });
  }

  // Enable/disable drag and drop
  setEnabled(enabled) {
    const handles = document.querySelectorAll('.block-handle');
    handles.forEach(handle => {
      if (enabled) {
        handle.parentElement.parentElement.setAttribute('draggable', 'true');
      } else {
        handle.parentElement.parentElement.removeAttribute('draggable');
      }
    });
  }

  // Destroy and clean up
  destroy() {
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }
    
    this.cleanupDragStyles();
  }
}