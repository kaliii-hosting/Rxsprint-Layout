import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { blockManager } from '../../utils/blockManager';
import './EnhancedRichTextEditor.css';

// Enhanced editor that works with block system
const EnhancedRichTextEditor = React.forwardRef(({ 
  blockId,
  value = '', 
  onChange, 
  placeholder = 'Start typing...', 
  readOnly = false,
  onImageUpload,
  onInsertBlock,
  onFocus,
  className = ''
}, ref) => {
  const [isReady, setIsReady] = useState(false);
  const editorContainerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'excel-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: value || '<p></p>',
    editable: !readOnly,
    autofocus: false,
    onCreate: ({ editor }) => {
      setIsReady(true);
    },
    onUpdate: ({ editor }) => {
      try {
        const html = editor.getHTML();
        if (onChange) {
          onChange(html);
        }
      } catch (error) {
        console.error('Error getting HTML:', error);
      }
    },
    onFocus: () => {
      if (onFocus) {
        onFocus(blockId);
      }
    }
  });

  // Handle paste events with block detection
  useEffect(() => {
    if (!editor || !isReady) return;

    const handlePaste = (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;
      
      // Check for large tables that should be separate blocks
      const htmlData = clipboardData.getData('text/html');
      const plainText = clipboardData.getData('text/plain');
      
      // Detect if it's a table or Excel data
      if (htmlData && htmlData.includes('<table')) {
        event.preventDefault();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlData;
        const table = tempDiv.querySelector('table');
        
        if (table) {
          const rows = table.querySelectorAll('tr').length;
          const cols = table.querySelector('tr')?.querySelectorAll('td, th').length || 0;
          
          // Always create tables as separate blocks for better display
          // This ensures horizontal scrolling and proper formatting
          if (onInsertBlock) {
            // Clean up Excel-specific styles for better display
            cleanExcelTable(table);
            
            onInsertBlock({
              type: 'table',
              content: {
                html: table.outerHTML,
                data: extractTableData(table),
                rows: rows,
                columns: cols
              }
            }, 'after');
          }
          return;
        }
      }
      
      // Also check for tab-separated data (plain text Excel paste)
      if (plainText && plainText.includes('\t')) {
        const rows = plainText.trim().split('\n');
        if (rows.length > 1) {
          event.preventDefault();
          
          // Convert tab-separated to table
          const tableData = rows.map(row => row.split('\t'));
          const htmlTable = createTableFromData(tableData);
          
          if (onInsertBlock) {
            onInsertBlock({
              type: 'table',
              content: {
                html: htmlTable,
                data: tableData,
                rows: tableData.length,
                columns: tableData[0]?.length || 0
              }
            }, 'after');
          }
          return;
        }
      }
      
      // Check for images
      const items = Array.from(clipboardData.items || []);
      const imageItem = items.find(item => item.type && item.type.startsWith('image/'));
      
      if (imageItem) {
        event.preventDefault();
        event.stopPropagation();
        const blob = imageItem.getAsFile();
        
        if (blob && onImageUpload) {
          onImageUpload(blob, true).then(url => {
            if (url) {
              // Large images as separate blocks
              if (blob.size > 500000) { // > 500KB
                if (onInsertBlock) {
                  onInsertBlock({
                    type: 'image',
                    content: {
                      src: url,
                      alt: 'Pasted image'
                    }
                  }, 'after');
                }
              } else {
                // Small images inline
                editor.chain().focus().setImage({ src: url }).run();
              }
            }
          }).catch(err => {
            console.error('Failed to upload pasted image:', err);
          });
        }
        return;
      }
      
      // Check for code blocks
      if (plainText && isCodeBlock(plainText)) {
        event.preventDefault();
        
        if (onInsertBlock) {
          onInsertBlock({
            type: 'code',
            content: {
              code: plainText,
              language: detectLanguage(plainText)
            }
          }, 'after');
        }
        return;
      }
    };

    const editorDom = editor.view?.dom || editorContainerRef.current?.querySelector('.ProseMirror');
    if (editorDom) {
      editorDom.addEventListener('paste', handlePaste, true);
      return () => {
        editorDom.removeEventListener('paste', handlePaste, true);
      };
    }
  }, [editor, onImageUpload, onInsertBlock, isReady]);

  // Handle Enter key for new blocks
  useEffect(() => {
    if (!editor || !isReady) return;

    const handleKeyDown = (event) => {
      // Ctrl/Cmd + Enter creates new text block
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        
        if (onInsertBlock) {
          onInsertBlock({
            type: 'text',
            content: '<p></p>'
          }, 'after');
        }
      }
      
      // Alt + B for banner
      else if (event.altKey && event.key === 'b') {
        event.preventDefault();
        
        if (onInsertBlock) {
          onInsertBlock({
            type: 'banner',
            content: {
              text: '',
              color: 'blue'
            }
          }, 'after');
        }
      }
      
      // Alt + T for table
      else if (event.altKey && event.key === 't') {
        event.preventDefault();
        
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      }
    };

    const editorDom = editor.view?.dom;
    if (editorDom) {
      editorDom.addEventListener('keydown', handleKeyDown);
      return () => {
        editorDom.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [editor, onInsertBlock, isReady]);

  // Expose editor instance
  React.useImperativeHandle(ref, () => ({
    editor,
    container: editorContainerRef.current,
    focus: () => editor?.commands.focus(),
    blur: () => editor?.commands.blur(),
    getHTML: () => editor?.getHTML(),
    setContent: (content) => editor?.commands.setContent(content)
  }), [editor]);

  // Update content when value changes
  useEffect(() => {
    if (editor && isReady && value !== editor.getHTML() && !editor.isFocused) {
      try {
        editor.commands.setContent(value || '<p></p>');
      } catch (error) {
        console.error('Error updating content:', error);
      }
    }
  }, [value, editor, isReady]);

  if (!editor || !isReady) {
    return (
      <div className={`enhanced-editor ${className}`}>
        <div className="editor-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div ref={editorContainerRef} className={`enhanced-editor ${className}`}>
      <EditorContent 
        editor={editor} 
        className="enhanced-editor-content"
      />
    </div>
  );
});

// Helper functions
function extractTableData(table) {
  const data = [];
  const rows = table.querySelectorAll('tr');
  
  rows.forEach(row => {
    const rowData = [];
    const cells = row.querySelectorAll('td, th');
    cells.forEach(cell => {
      rowData.push({
        value: cell.textContent.trim(),
        isHeader: cell.tagName === 'TH'
      });
    });
    data.push(rowData);
  });
  
  return data;
}

// Clean Excel-specific formatting
function cleanExcelTable(table) {
  // Remove Excel-specific styles that cause small fonts
  table.removeAttribute('style');
  table.removeAttribute('width');
  table.removeAttribute('height');
  
  // Clean all cells
  const cells = table.querySelectorAll('td, th');
  cells.forEach(cell => {
    // Remove inline styles that might have small font sizes
    const style = cell.getAttribute('style');
    if (style) {
      // Keep only essential styles
      const cleanedStyle = style
        .replace(/font-size:[^;]+;?/gi, '')
        .replace(/font-family:[^;]+;?/gi, '')
        .replace(/line-height:[^;]+;?/gi, '')
        .replace(/width:[^;]+;?/gi, '')
        .replace(/height:[^;]+;?/gi, '');
      
      if (cleanedStyle.trim()) {
        cell.setAttribute('style', cleanedStyle);
      } else {
        cell.removeAttribute('style');
      }
    }
    
    // Remove Excel-specific classes
    const className = cell.className;
    if (className && className.includes('xl')) {
      cell.className = '';
    }
  });
}

// Create HTML table from tab-separated data
function createTableFromData(data) {
  let html = '<table class="excel-pasted-table">';
  
  data.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach(cell => {
      const tag = rowIndex === 0 ? 'th' : 'td';
      const escapedCell = (cell || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      html += `<${tag}>${escapedCell}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
}

function isCodeBlock(text) {
  // Simple heuristic: contains multiple lines with consistent indentation
  // or starts with common code patterns
  const lines = text.split('\n');
  if (lines.length < 3) return false;
  
  const codePatterns = [
    /^(function|const|let|var|class|import|export)/,
    /^(def|class|import|from)/,  // Python
    /^(public|private|class|interface)/,  // Java/C#
    /^(<\?php|namespace|use)/,  // PHP
  ];
  
  return codePatterns.some(pattern => pattern.test(text.trim()));
}

function detectLanguage(code) {
  // Simple language detection
  if (code.includes('function') || code.includes('const ') || code.includes('=>')) {
    return 'javascript';
  }
  if (code.includes('def ') || code.includes('import ')) {
    return 'python';
  }
  if (code.includes('<?php')) {
    return 'php';
  }
  if (code.includes('<html') || code.includes('<div')) {
    return 'html';
  }
  if (code.includes('.css') || code.includes('{') && code.includes('}')) {
    return 'css';
  }
  return 'plaintext';
}

EnhancedRichTextEditor.displayName = 'EnhancedRichTextEditor';

export default EnhancedRichTextEditor;