// Utility functions for copying tables to clipboard in Excel-compatible format

export const copyTableToClipboard = async (tableElement) => {
  try {
    // Convert table to tab-separated format for Excel
    const rows = [];
    const tableRows = tableElement.querySelectorAll('tr');
    
    tableRows.forEach(row => {
      const cells = [];
      const tableCells = row.querySelectorAll('td, th');
      
      tableCells.forEach(cell => {
        let cellContent = cell.innerText || cell.textContent || '';
        
        // Handle cells with line breaks
        if (cellContent.includes('\n')) {
          cellContent = '"' + cellContent.replace(/"/g, '""') + '"';
        }
        
        cells.push(cellContent);
      });
      
      if (cells.length > 0) {
        rows.push(cells.join('\t'));
      }
    });
    
    const plainText = rows.join('\n');
    
    // Create HTML version for rich formatting
    const tableClone = tableElement.cloneNode(true);
    
    // Remove any copy buttons from the clone
    const copyButtons = tableClone.querySelectorAll('.table-copy-btn');
    copyButtons.forEach(btn => btn.remove());
    
    // Add Excel-friendly styles
    tableClone.style.borderCollapse = 'collapse';
    const cells = tableClone.querySelectorAll('td, th');
    cells.forEach(cell => {
      cell.style.border = '1px solid #000000';
      cell.style.padding = '8px';
      if (cell.tagName === 'TH') {
        cell.style.fontWeight = 'bold';
        cell.style.backgroundColor = '#f0f0f0';
      }
    });
    
    const htmlText = tableClone.outerHTML;
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([htmlText], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      });
      
      await navigator.clipboard.write([clipboardItem]);
      return true;
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy table:', error);
    
    // Last resort fallback
    try {
      const range = document.createRange();
      range.selectNode(tableElement);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      return true;
    } catch (fallbackError) {
      console.error('All copy methods failed:', fallbackError);
      return false;
    }
  }
};

export const addCopyButtonToTable = (table, isEditMode = false) => {
  // Don't add buttons anymore - using right-click context menu instead
  return;
};

// Helper function to create copy button
const createCopyButton = (table) => {
  const button = document.createElement('button');
  button.className = 'table-copy-btn';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>Copy</span>
  `;
  
  // Style the button - make it sticky so it stays visible when scrolling
  button.style.position = 'sticky';
  button.style.top = '5px';
  button.style.left = '5px';
  button.style.float = 'left';
  button.style.marginRight = '10px';
  button.style.marginBottom = '5px';
  button.style.zIndex = '10';
  button.style.padding = '4px 8px';
  button.style.backgroundColor = '#FF6900';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '12px';
  button.style.fontWeight = '500';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '4px';
  button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  button.style.transition = 'all 0.2s ease';
  
  // Add hover effect
  button.onmouseenter = () => {
    button.style.backgroundColor = '#FF7A00';
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
  };
  
  button.onmouseleave = () => {
    button.style.backgroundColor = '#FF6900';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  };
  
  // Add click handler
  button.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await copyTableToClipboard(table);
    
    if (success) {
      // Show success feedback
      const originalHTML = button.innerHTML;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copied!</span>
      `;
      button.style.backgroundColor = '#00C853';
      
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.backgroundColor = '#FF6900';
      }, 2000);
    } else {
      alert('Failed to copy table. Please try selecting and copying manually.');
    }
  };
  
  return button;
};

export const addCopyButtonsToAllTables = (container, isEditMode = false) => {
  // Don't add buttons anymore - using right-click context menu instead
  return;
};

export const observeTablesAndAddButtons = (container, isEditMode = false) => {
  // Don't add buttons anymore - using right-click context menu instead
  // This function is kept for backward compatibility but does nothing
  return null;
};