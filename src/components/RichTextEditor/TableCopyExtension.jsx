import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Copy, CheckCircle } from 'lucide-react';
import './TableCopyExtension.css';

// Helper function to convert HTML table to Excel-compatible format
const convertTableToExcelFormat = (tableElement) => {
  const rows = [];
  const tableRows = tableElement.querySelectorAll('tr');
  
  tableRows.forEach(row => {
    const cells = [];
    const tableCells = row.querySelectorAll('td, th');
    
    tableCells.forEach(cell => {
      // Get cell text content and preserve formatting
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
  
  return rows.join('\n');
};

// Helper function to create HTML table for clipboard
const createHTMLTable = (tableElement) => {
  // Clone the table to preserve styles
  const tableClone = tableElement.cloneNode(true);
  
  // Add Excel-friendly styles
  tableClone.style.borderCollapse = 'collapse';
  tableClone.style.width = '100%';
  
  // Style all cells
  const cells = tableClone.querySelectorAll('td, th');
  cells.forEach(cell => {
    cell.style.border = '1px solid #000000';
    cell.style.padding = '8px';
    cell.style.textAlign = 'left';
    
    // Make headers bold
    if (cell.tagName === 'TH') {
      cell.style.fontWeight = 'bold';
      cell.style.backgroundColor = '#f0f0f0';
    }
  });
  
  // Wrap in a container div for proper HTML structure
  const container = document.createElement('div');
  container.appendChild(tableClone);
  
  return container.innerHTML;
};

// Floating button component
const TableCopyButton = ({ table, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    const updatePosition = () => {
      if (table) {
        const rect = table.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        setPosition({
          top: rect.top + scrollTop - 10,
          left: rect.right + scrollLeft + 10
        });
      }
    };
    
    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [table]);
  
  const handleCopy = async () => {
    try {
      // Get both plain text and HTML formats
      const plainText = convertTableToExcelFormat(table);
      const htmlText = createHTMLTable(table);
      
      // Use Clipboard API with multiple formats
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        
        await navigator.clipboard.write([clipboardItem]);
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
      }
      
      setCopied(true);
      if (onCopy) onCopy();
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy table:', error);
      
      // Fallback copy method
      try {
        const range = document.createRange();
        range.selectNode(table);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        
        setCopied(true);
        if (onCopy) onCopy();
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
        alert('Failed to copy table. Please try selecting and copying manually.');
      }
    }
  };
  
  return (
    <button
      className={`table-copy-button ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      title={copied ? 'Copied!' : 'Copy table for Excel'}
    >
      {copied ? (
        <CheckCircle size={20} className="copy-icon-success" />
      ) : (
        <Copy size={20} className="copy-icon" />
      )}
      <span className="copy-text">
        {copied ? 'Copied!' : 'Copy for Excel'}
      </span>
    </button>
  );
};

// Main extension component
export const TableCopyExtension = ({ editorElement }) => {
  const [tables, setTables] = useState([]);
  
  useEffect(() => {
    if (!editorElement) return;
    
    const updateTables = () => {
      const allTables = editorElement.querySelectorAll('table');
      setTables(Array.from(allTables));
    };
    
    // Initial scan
    updateTables();
    
    // Watch for changes
    const observer = new MutationObserver(updateTables);
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    return () => observer.disconnect();
  }, [editorElement]);
  
  if (tables.length === 0) return null;
  
  return (
    <>
      {tables.map((table, index) => (
        <TableCopyButton
          key={`table-copy-${index}`}
          table={table}
          onCopy={() => console.log(`Table ${index + 1} copied`)}
        />
      ))}
    </>
  );
};

// Hook to use the extension
export const useTableCopyExtension = (editorRef) => {
  const [portalContainer, setPortalContainer] = useState(null);
  const [root, setRoot] = useState(null);
  
  useEffect(() => {
    // Create a portal container for the floating buttons
    const container = document.createElement('div');
    container.className = 'table-copy-extension-portal';
    document.body.appendChild(container);
    setPortalContainer(container);
    
    // Create root for React 18
    const newRoot = createRoot(container);
    setRoot(newRoot);
    
    return () => {
      if (newRoot) {
        // Cleanup the root
        setTimeout(() => {
          newRoot.unmount();
        }, 0);
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, []);
  
  useEffect(() => {
    if (!root || !editorRef?.current) return;
    
    const editorElement = editorRef.current.querySelector('.ProseMirror');
    if (!editorElement) return;
    
    // Render the extension using React 18 root
    root.render(
      <TableCopyExtension editorElement={editorElement} />
    );
    
    return () => {
      // No need to unmount here as it's handled in the cleanup
    };
  }, [root, editorRef]);
};

export default TableCopyExtension;