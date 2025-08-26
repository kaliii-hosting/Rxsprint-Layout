import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../config/firebase';
import { collection, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import './TextOrganizer.css';

class TextOrganizerCore {
  constructor(blockElement, onSave) {
    this.block = blockElement;
    this.blockId = blockElement.dataset?.blockId || this.generateId();
    this.onSave = onSave;
    this.hasChanges = false;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;
  }

  generateId() {
    return `text-org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  formatContent(content, isHtml = false) {
    let formatted = content;

    // Clean OneNote/Office artifacts FIRST
    formatted = this.cleanOneNote(formatted, isHtml);
    
    // Format lists and bullet points
    formatted = this.formatLists(formatted, isHtml);
    
    // Format tables
    formatted = this.formatTables(formatted, isHtml);
    
    // Fix spacing (1 line between paragraphs)
    formatted = this.fixSpacing(formatted);
    
    // Detect and format titles
    formatted = this.formatTitles(formatted);
    
    // Format special content (URLs, emails, dates, code)
    formatted = this.formatSpecialContent(formatted);
    
    return formatted;
  }

  cleanOneNote(content, isHtml) {
    if (isHtml) {
      // Remove XML namespaces and Office-specific artifacts
      content = content.replace(/xmlns[^=]*="[^"]*"/gi, '');
      content = content.replace(/urn:schemas[^\s>]*/gi, '');
      content = content.replace(/<\?xml[^>]*>/gi, '');
      content = content.replace(/<\/?o:[^>]*>/gi, '');
      content = content.replace(/<\/?w:[^>]*>/gi, '');
      content = content.replace(/<\/?m:[^>]*>/gi, '');
      content = content.replace(/<!--[\s\S]*?-->/gi, '');
      
      // Remove OneNote/Word specific tags and attributes
      content = content.replace(/<o:p[^>]*>.*?<\/o:p>/gi, '');
      content = content.replace(/mso-[^;"]*/gi, '');
      content = content.replace(/class="Mso[^"]*"/gi, '');
      content = content.replace(/style="[^"]*mso[^"]*"/gi, '');
      
      // Clean table attributes
      content = content.replace(/class="?MsoTableGrid"?/gi, '');
      content = content.replace(/border=1/gi, 'border="1"');
      content = content.replace(/cellspacing=0/gi, 'cellspacing="0"');
      
      // Remove unnecessary spans but preserve content
      content = content.replace(/<span[^>]*>([^<]*)<\/span>/gi, '$1');
      
      // Clean up tags
      content = content.replace(/<p[^>]*>/gi, '<p>');
      content = content.replace(/<div[^>]*>/gi, '<div>');
      content = content.replace(/<table[^>]*>/gi, '<table>');
      content = content.replace(/<tr[^>]*>/gi, '<tr>');
      content = content.replace(/<td[^>]*>/gi, '<td>');
      content = content.replace(/<th[^>]*>/gi, '<th>');
      emov
      // Remove empty paragraphs
      content = content.replace(/<p>\s*(&nbsp;)*\s*<\/p>/gi, '');
      
      // Preserve formatting
      content = content.replace(/<b>/gi, '<strong>');
      content = content.replace(/<\/b>/gi, '</strong>');
      content = content.replace(/<i>/gi, '<em>');
      content = content.replace(/<\/i>/gi, '</em>');
      
      // Clean up malformed quotes and brackets
      content = content.replace(/">">/gi, '');
      content = content.replace(/>\s*>/gi, '>');
      content = content.replace(/<\s*</gi, '<');
    }
    
    // Remove multiple spaces
    content = content.replace(/\s+/g, ' ');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return content;
  }

  formatTables(content, isHtml) {
    if (isHtml) {
      // Detect and format Excel/OneNote tables
      const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
      content = content.replace(tableRegex, (match) => {
        // Clean table HTML
        let cleanTable = match;
        cleanTable = cleanTable.replace(/style="[^"]*"/gi, '');
        cleanTable = cleanTable.replace(/class="[^"]*"/gi, '');
        cleanTable = cleanTable.replace(/width="[^"]*"/gi, '');
        cleanTable = cleanTable.replace(/height="[^"]*"/gi, '');
        
        // Add our formatting classes
        cleanTable = cleanTable.replace('<table', '<table class="formatted-table"');
        
        // Handle merged cells
        cleanTable = cleanTable.replace(/colspan="(\d+)"/gi, 'colspan="$1" class="merged-cell"');
        cleanTable = cleanTable.replace(/rowspan="(\d+)"/gi, 'rowspan="$1" class="merged-cell"');
        
        // Make headers sortable
        cleanTable = cleanTable.replace(/<th/gi, '<th class="sortable-header" onclick="window.textOrganizerSort(this)"');
        
        return `<div class="table-container">${cleanTable}</div>`;
      });
    }
    
    // Detect plain text tables (tab or pipe separated)
    const lines = content.split('\n');
    let inTable = false;
    let tableLines = [];
    let formattedLines = [];
    
    for (let line of lines) {
      if (line.includes('\t') || line.includes('|')) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else if (inTable) {
        // Convert accumulated table lines to HTML table
        if (tableLines.length > 0) {
          formattedLines.push(this.convertTextToTable(tableLines));
        }
        inTable = false;
        tableLines = [];
        formattedLines.push(line);
      } else {
        formattedLines.push(line);
      }
    }
    
    // Handle remaining table lines
    if (inTable && tableLines.length > 0) {
      formattedLines.push(this.convertTextToTable(tableLines));
    }
    
    return formattedLines.join('\n');
  }

  convertTextToTable(lines) {
    const separator = lines[0].includes('\t') ? '\t' : '|';
    let html = '<div class="table-container"><table class="formatted-table">';
    
    lines.forEach((line, index) => {
      const cells = line.split(separator).map(cell => cell.trim());
      const tag = index === 0 ? 'th' : 'td';
      const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
      
      html += `<tr class="${rowClass}">`;
      cells.forEach(cell => {
        const isNumeric = !isNaN(cell) && cell !== '';
        const cellClass = isNumeric ? 'numeric-cell' : '';
        if (tag === 'th') {
          html += `<th class="sortable-header ${cellClass}" onclick="window.textOrganizerSort(this)">${cell}</th>`;
        } else {
          html += `<td class="${cellClass}">${cell}</td>`;
        }
      });
      html += '</tr>';
    });
    
    html += '</table></div>';
    return html;
  }

  fixSpacing(content) {
    // Ensure exactly 1 line between paragraphs
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/(<\/p>)\s*(<p>)/gi, '$1\n\n$2');
    content = content.replace(/(<br\s*\/?>)\s*(<br\s*\/?>)+/gi, '<br>');
    
    return content;
  }

  formatLists(content, isHtml) {
    if (isHtml) {
      // Preserve lists
      content = content.replace(/<ul[^>]*>/gi, '<ul>');
      content = content.replace(/<ol[^>]*>/gi, '<ol>');
      content = content.replace(/<li[^>]*>/gi, '<li>');
      
      // Convert bullet symbols to proper list items if not already in list
      const bulletPatterns = [
        /^[•·●▪▫◦‣⁃]\s*/gm,
        /^[-*+]\s+/gm,
        /^\d+[.)\.]\s+/gm
      ];
      
      for (let pattern of bulletPatterns) {
        content = content.replace(pattern, (match) => {
          if (match.match(/^\d/)) {
            return '<li>';
          }
          return '<li>';
        });
      }
    } else {
      // For plain text, convert common bullet patterns
      content = content.replace(/^[•·●▪▫◦‣⁃]/gm, '•');
      content = content.replace(/^[-*+]\s+/gm, '• ');
    }
    
    return content;
  }

  formatTitles(content) {
    // Auto-detect titles with ** ** or ## markers
    content = content.replace(/\*\*([^*]+)\*\*/g, '<div class="title-banner">$1</div>');
    content = content.replace(/^##\s+(.+)$/gm, '<div class="title-banner">$1</div>');
    
    // Handle manual title marking (will be handled by React component)
    
    return content;
  }

  formatSpecialContent(content) {
    // Format URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    content = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    // Format emails
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    content = content.replace(emailRegex, '<a href="mailto:$1">$1</a>');
    
    // Standardize dates (MM/DD/YYYY)
    const dateRegex = /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/g;
    content = content.replace(dateRegex, (match, m, d, y) => {
      const year = y.length === 2 ? '20' + y : y;
      return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${year}`;
    });
    
    // Detect code snippets (backticks or indented blocks)
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    content = content.replace(/^    (.+)$/gm, '<pre><code>$1</code></pre>');
    
    // Format quotes
    content = content.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');
    content = content.replace(/"([^"]+)"/g, '<span class="quoted-text">"$1"</span>');
    
    return content;
  }

  handleImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Auto-resize to fit block width
          const maxWidth = 600;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          resolve({
            src: e.target.result,
            width: width,
            height: height,
            originalWidth: img.width,
            originalHeight: img.height
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}

const TextOrganizer = ({ blockId, initialContent, onDelete, onUpdate }) => {
  const [content, setContent] = useState(initialContent?.content || '');
  const [title, setTitle] = useState(initialContent?.title || '');
  const [images, setImages] = useState(initialContent?.images || []);
  const [tables, setTables] = useState(initialContent?.tables || []);
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' or 'raw'
  const [hasChanges, setHasChanges] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const pasteAreaRef = useRef(null);
  const organizerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const coreRef = useRef(null);

  // Initialize core organizer
  useEffect(() => {
    if (organizerRef.current) {
      coreRef.current = new TextOrganizerCore(organizerRef.current, handleSave);
    }
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (hasChanges) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        handleSave();
      }, 5000);
    }
    
    return () => clearTimeout(saveTimerRef.current);
  }, [hasChanges, content, title, images, tables]);

  const handleSave = useCallback(async () => {
    if (!blockId || !db) return;
    
    try {
      setIsLoading(true);
      const blockData = {
        title: title,
        content: content,
        images: images,
        tables: tables,
        viewMode: viewMode,
        lastModified: serverTimestamp()
      };
      
      await setDoc(doc(db, 'textOrganizerBlocks', blockId), blockData);
      setHasChanges(false);
      
      if (onUpdate) {
        onUpdate(blockId, blockData);
      }
    } catch (error) {
      console.error('Error saving text organizer block:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blockId, title, content, images, tables, viewMode, onUpdate]);

  const handlePaste = useCallback(async (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    
    // Clear placeholder on first paste
    const isPlaceholder = !content || content === '<div class="placeholder">📋 Paste your content here (text, images, or tables)</div>' || content.includes('placeholder');
    
    // Get content
    let htmlContent = clipboardData.getData('text/html');
    const textContent = clipboardData.getData('text/plain');
    
    // Process images FIRST
    const items = Array.from(clipboardData.items);
    const imagePromises = [];
    let hasImages = false;
    
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        hasImages = true;
        const file = item.getAsFile();
        if (file && coreRef.current) {
          imagePromises.push(coreRef.current.handleImage(file));
        }
      }
    }
    
    // Wait for images to process
    const processedImages = await Promise.all(imagePromises);
    if (processedImages.length > 0) {
      setImages(prev => [...prev, ...processedImages]);
      setHasChanges(true);
    }
    
    // Only process text if there's content and it's not just an image paste
    const contentToProcess = htmlContent || textContent;
    
    if (contentToProcess && coreRef.current) {
      // Clean and format content
      const formatted = coreRef.current.formatContent(contentToProcess, !!htmlContent);
      
      if (isPlaceholder) {
        // Replace placeholder with new content
        setContent(formatted);
      } else {
        // Append to existing content
        setContent(prev => {
          const cleanPrev = prev.replace(/<div class="placeholder">.*?<\/div>/, '');
          return cleanPrev ? cleanPrev + '\n\n' + formatted : formatted;
        });
      }
      
      setHasChanges(true);
    } else if (hasImages && isPlaceholder) {
      // If only images were pasted and we have placeholder, clear it
      setContent('');
      setHasChanges(true);
    }
  }, [content]);

  const handleContentChange = useCallback((e) => {
    const newContent = e.target.innerHTML;
    // Remove placeholder when user starts typing
    if (newContent.includes('placeholder')) {
      // Check if there's actual content besides the placeholder
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      if (textContent.replace(/📋.*?\(text, images, or tables\)/g, '').trim()) {
        // User has typed something, remove placeholder
        const cleanContent = newContent.replace(/<div class="placeholder">.*?<\/div>/, '');
        setContent(cleanContent);
      } else {
        // Still just placeholder
        setContent(newContent);
      }
    } else {
      setContent(newContent);
    }
    setHasChanges(true);
  }, []);

  const handleTitleChange = useCallback((e) => {
    setTitle(e.target.value);
    setHasChanges(true);
  }, []);

  const handleContextMenu = useCallback((e) => {
    const selection = window.getSelection();
    if (selection.toString()) {
      e.preventDefault();
      setContextMenu({
        x: e.pageX,
        y: e.pageY,
        selection: selection.toString(),
        range: selection.getRangeAt(0)
      });
    }
  }, []);

  const markAsTitle = useCallback(() => {
    if (contextMenu && contextMenu.range) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'title-banner';
      titleDiv.textContent = contextMenu.selection;
      
      contextMenu.range.deleteContents();
      contextMenu.range.insertNode(titleDiv);
      
      setHasChanges(true);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const toggleView = useCallback(() => {
    setViewMode(prev => prev === 'formatted' ? 'raw' : 'formatted');
  }, []);

  const copyFormatted = useCallback(() => {
    if (pasteAreaRef.current) {
      const text = pasteAreaRef.current.innerText;
      navigator.clipboard.writeText(text);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this text organizer block?')) {
      if (blockId && db) {
        try {
          await deleteDoc(doc(db, 'textOrganizerBlocks', blockId));
        } catch (error) {
          console.error('Error deleting block:', error);
        }
      }
      if (onDelete) {
        onDelete(blockId);
      }
    }
  }, [blockId, onDelete]);

  const handleUndo = useCallback((e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      // Implement undo logic
    }
  }, []);

  const handleRedo = useCallback((e) => {
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      // Implement redo logic
    }
  }, []);

  // Setup keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleUndo);
    document.addEventListener('keydown', handleRedo);
    
    return () => {
      document.removeEventListener('keydown', handleUndo);
      document.removeEventListener('keydown', handleRedo);
    };
  }, [handleUndo, handleRedo]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="text-organizer-block" data-block-id={blockId} ref={organizerRef}>
      <div className="block-header">
        <div className="block-header-content">
          <span className="block-icon">📝</span>
          <input 
            className="block-title-input" 
            placeholder="Text Organizer Block"
            value={title}
            onChange={handleTitleChange}
          />
        </div>
        <div className="block-controls">
          <button className="control-btn save-btn" onClick={handleSave}>
            {hasChanges ? '💾 Save Changes' : '✅ Saved'}
          </button>
          <button className="control-btn toggle-view" onClick={toggleView}>
            {viewMode === 'formatted' ? '📄 Raw' : '✨ Formatted'}
          </button>
          <button className="control-btn copy-formatted" onClick={copyFormatted}>
            📋 Copy
          </button>
          <button className="control-btn delete-block" onClick={handleDelete}>
            🗑️
          </button>
        </div>
      </div>
      
      <div className="block-content">
        {viewMode === 'formatted' ? (
          <div 
            className="paste-area formatted-view"
            contentEditable={true}
            ref={pasteAreaRef}
            onPaste={handlePaste}
            onInput={handleContentChange}
            onContextMenu={handleContextMenu}
            dangerouslySetInnerHTML={{ __html: content || '<div class="placeholder">📋 Paste your content here (text, images, or tables)</div>' }}
            suppressContentEditableWarning={true}
          />
        ) : (
          <textarea
            className="paste-area raw-view"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Paste or type your content here..."
          />
        )}
        
        {images.length > 0 && (
          <div className="image-container">
            {images.map((img, index) => (
              <img 
                key={index}
                src={img.src}
                alt={`Pasted image ${index + 1}`}
                style={{ 
                  maxWidth: '100%',
                  width: `${img.width}px`,
                  height: 'auto'
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ 
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button onClick={markAsTitle}>Mark as Title</button>
        </div>
      )}
      
      {isLoading && <div className="saving-indicator">Saving...</div>}
      {hasChanges && !isLoading && (
        <div className="unsaved-changes-indicator">
          ⚠️ Unsaved changes (Auto-saves in 5 seconds or click Save)
        </div>
      )}
    </div>
  );
};

// Global function for table sorting
window.textOrganizerSort = function(headerElement) {
  const table = headerElement.closest('table');
  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => !row.querySelector('th'));
  const headerIndex = Array.from(headerElement.parentElement.children).indexOf(headerElement);
  
  const isNumeric = rows.every(row => {
    const cell = row.children[headerIndex];
    return cell && !isNaN(cell.textContent);
  });
  
  rows.sort((a, b) => {
    const aValue = a.children[headerIndex]?.textContent || '';
    const bValue = b.children[headerIndex]?.textContent || '';
    
    if (isNumeric) {
      return parseFloat(aValue) - parseFloat(bValue);
    }
    return aValue.localeCompare(bValue);
  });
  
  // Toggle sort direction
  if (headerElement.classList.contains('sorted-asc')) {
    rows.reverse();
    headerElement.classList.remove('sorted-asc');
    headerElement.classList.add('sorted-desc');
  } else {
    headerElement.classList.remove('sorted-desc');
    headerElement.classList.add('sorted-asc');
  }
  
  // Re-append rows
  rows.forEach(row => tbody.appendChild(row));
  
  // Add sum row for numeric columns
  if (isNumeric) {
    let sumRow = table.querySelector('.sum-row');
    if (!sumRow) {
      sumRow = document.createElement('tr');
      sumRow.className = 'sum-row';
      tbody.appendChild(sumRow);
    }
    
    const sum = rows.reduce((total, row) => {
      const value = parseFloat(row.children[headerIndex]?.textContent || 0);
      return total + value;
    }, 0);
    
    sumRow.innerHTML = '';
    for (let i = 0; i < headerElement.parentElement.children.length; i++) {
      const cell = document.createElement('td');
      if (i === headerIndex) {
        cell.textContent = `Sum: ${sum.toFixed(2)}`;
        cell.className = 'sum-cell';
      }
      sumRow.appendChild(cell);
    }
  }
};

export default TextOrganizer;