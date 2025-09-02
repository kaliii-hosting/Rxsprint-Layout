import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
// BannerNode removed - banners are now displayed separately above the editor
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code,
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Image as ImageIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon
} from 'lucide-react';
import './RichTextEditor.css';

// Force table scrolling styles
const tableScrollStyles = `
  .ProseMirror .tableWrapper {
    overflow-x: auto !important;
    overflow-y: auto !important;
    max-height: calc(100vh - 200px) !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .ProseMirror .tableWrapper::-webkit-scrollbar {
    width: 14px !important;
    height: 14px !important;
    display: block !important;
  }
  .ProseMirror .tableWrapper::-webkit-scrollbar-thumb {
    background: #FF6900 !important;
    border-radius: 7px !important;
  }
`;

const RichTextEditor = React.forwardRef(({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...', 
  readOnly = false,
  onImageUpload,
  className = '',
  hideToolbar = false
}, ref) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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
      // Mark editor as ready
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
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expose editor instance to parent
  React.useImperativeHandle(ref, () => ({
    editor,
    container: editorContainerRef.current
  }), [editor]);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && isReady && value !== editor.getHTML() && !editor.isFocused) {
      try {
        editor.commands.setContent(value || '<p></p>');
      } catch (error) {
        console.error('Error updating content:', error);
      }
    }
  }, [value, editor, isReady]);

  // Handle image upload
  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload || !editor) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const url = await onImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    
    input.click();
  }, [editor, onImageUpload]);

  // Handle paste events for images and tables
  useEffect(() => {
    if (!editor || !isReady) return;

    const handlePaste = (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      
      // Get clipboard data
      const plainText = clipboardData.getData('text/plain');
      const htmlData = clipboardData.getData('text/html');
      
      // FIRST: Check for Excel/table data (before checking for images)
      // Excel copies both HTML table and image, we want the table not the image
      
      // Check if we have HTML table data (from Excel or other sources)
      if (htmlData && (htmlData.includes('<table') || htmlData.includes('<TABLE'))) {
        event.preventDefault();
        
        // Clean up Excel HTML to work better with TipTap
        let cleanedHtml = htmlData;
        
        // Remove Excel-specific styles and attributes that might cause issues
        cleanedHtml = cleanedHtml.replace(/mso-[^;]+;?/gi, ''); // Remove MSO styles
        cleanedHtml = cleanedHtml.replace(/style="[^"]*"/gi, ''); // Remove inline styles
        cleanedHtml = cleanedHtml.replace(/class="[^"]*"/gi, ''); // Remove classes
        cleanedHtml = cleanedHtml.replace(/width="[^"]*"/gi, ''); // Remove width attributes
        cleanedHtml = cleanedHtml.replace(/height="[^"]*"/gi, ''); // Remove height attributes
        
        // Insert the cleaned table at current cursor position
        editor.chain().focus().insertContent(cleanedHtml, {
          parseOptions: {
            preserveWhitespace: false
          }
        }).run();
        return true;
      }
      
      // Check if it's tab-separated data (plain text table)
      if (plainText && plainText.includes('\t')) {
        event.preventDefault();
        
        // Convert tab-separated data to HTML table
        const rows = plainText.trim().split('\n');
        let html = '<table><tbody>';
        
        rows.forEach((row, rowIndex) => {
          const cells = row.split('\t');
          html += '<tr>';
          
          cells.forEach(cell => {
            const tag = rowIndex === 0 ? 'th' : 'td';
            const cellContent = cell.trim().replace(/"/g, '&quot;');
            html += `<${tag}>${cellContent}</${tag}>`;
          });
          
          html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        // Insert the table at current cursor position
        editor.chain().focus().insertContent(html, {
          parseOptions: {
            preserveWhitespace: false
          }
        }).run();
        return true;
      }
      
      // Check if it's tab-separated data (plain text table from Excel)
      if (plainText && plainText.includes('\t')) {
        event.preventDefault();
        
        // Convert tab-separated data to HTML table
        const rows = plainText.trim().split('\n');
        let html = '<table><tbody>';
        
        rows.forEach((row, rowIndex) => {
          const cells = row.split('\t');
          html += '<tr>';
          
          cells.forEach(cell => {
            const tag = rowIndex === 0 ? 'th' : 'td';
            const cellContent = cell.trim().replace(/"/g, '&quot;');
            html += `<${tag}>${cellContent}</${tag}>`;
          });
          
          html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        // Insert the table
        editor.chain().focus().insertContent(html, {
          parseOptions: {
            preserveWhitespace: false
          }
        }).run();
        return true;
      }
      
      // NOW check for images (only if it's not a table)
      if (onImageUpload && clipboardData) {
        const items = Array.from(clipboardData.items || []);
        const imageItem = items.find(item => item.type && item.type.startsWith('image/'));
        
        if (imageItem) {
          event.preventDefault();
          event.stopPropagation();
          const blob = imageItem.getAsFile();
          if (blob) {
            console.log('Pasting image, size:', blob.size, 'type:', blob.type);
            Promise.resolve(onImageUpload(blob, true))
              .then(url => {
                if (url) {
                  console.log('Image uploaded, inserting into editor:', url);
                  editor.chain().focus().setImage({ src: url }).run();
                } else {
                  console.warn('No URL returned from image upload');
                }
              })
              .catch(err => {
                console.error('Failed to upload pasted image:', err);
                // Don't show alert for CORS errors, they're expected in development
                if (!err.message?.includes('CORS')) {
                  alert('Failed to upload image. Please try again.');
                }
              });
          }
          return true;
        }
      }
      
      // Handle plain text with line breaks (preserve formatting)
      if (plainText && !htmlData) {
        event.preventDefault();
        
        // Split text by double line breaks for paragraphs
        const paragraphs = plainText.split(/\n\n+/);
        
        // Convert to HTML preserving line breaks
        let formattedHtml = '';
        paragraphs.forEach(paragraph => {
          // Replace single line breaks with <br> within paragraphs
          const lines = paragraph.split('\n');
          if (lines.length > 1) {
            // Multiple lines in paragraph - preserve as separate lines
            formattedHtml += '<p>' + lines.join('<br>') + '</p>';
          } else if (paragraph.trim()) {
            // Single line paragraph
            formattedHtml += '<p>' + paragraph + '</p>';
          }
        });
        
        // If no paragraphs were created, handle single lines
        if (!formattedHtml && plainText.trim()) {
          const lines = plainText.split('\n');
          if (lines.length > 1) {
            // Multiple lines - preserve each as its own paragraph
            formattedHtml = lines
              .filter(line => line.trim())
              .map(line => '<p>' + line + '</p>')
              .join('');
          } else {
            // Single line
            formattedHtml = '<p>' + plainText + '</p>';
          }
        }
        
        // Insert the formatted content
        if (formattedHtml) {
          editor.chain().focus().insertContent(formattedHtml, {
            parseOptions: {
              preserveWhitespace: true
            }
          }).run();
        }
        return true;
      }
      
      return false;
    };

    // Add paste listener to the editor's DOM element
    const editorDom = editor.view?.dom || editorContainerRef.current?.querySelector('.ProseMirror');
    
    if (editorDom) {
      editorDom.addEventListener('paste', handlePaste, true);
      
      return () => {
        editorDom.removeEventListener('paste', handlePaste, true);
      };
    }
  }, [editor, onImageUpload, isReady]);

  if (!editor || !isReady) {
    return (
      <div className={`rich-text-editor tiptap-editor ${className} ${isMobile ? 'mobile' : ''}`}>
        <div className="editor-loading">
          <div className="spinner" />
          <span>Loading editor...</span>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({ onClick, isActive, children, title }) => (
    <button
      onClick={onClick}
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      title={title}
      type="button"
      onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
    >
      {children}
    </button>
  );

  return (
    <div ref={editorContainerRef} className={`rich-text-editor tiptap-editor ${className} ${isMobile ? 'mobile' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: tableScrollStyles }} />
      {!hideToolbar && (
        <div className="editor-toolbar">
        {/* Text formatting */}
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Code"
          >
            <Code size={18} />
          </ToolbarButton>
        </div>

        {/* Headings - desktop only */}
        {!isMobile && (
          <div className="toolbar-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={18} />
            </ToolbarButton>
          </div>
        )}

        {/* Lists */}
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </ToolbarButton>
          {!isMobile && (
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={18} />
            </ToolbarButton>
          )}
        </div>

        {/* Image */}
        {onImageUpload && (
          <div className="toolbar-group">
            <ToolbarButton
              onClick={handleImageUpload}
              title="Insert Image"
            >
              <ImageIcon size={18} />
            </ToolbarButton>
          </div>
        )}

        {/* Table */}
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              // Add a small delay then trigger double-click on the new table
              setTimeout(() => {
                const newTable = editor.view.dom.querySelector('table:last-of-type');
                if (newTable) {
                  const event = new MouseEvent('dblclick', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                  });
                  newTable.dispatchEvent(event);
                }
              }, 100);
            }}
            title="Insert Excel Table"
          >
            <TableIcon size={18} />
          </ToolbarButton>
        </div>

        {/* History - desktop only */}
        {!isMobile && (
          <div className="toolbar-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo"
            >
              <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo"
            >
              <Redo size={18} />
            </ToolbarButton>
          </div>
        )}
      </div>
      )}
      
      <EditorContent 
        editor={editor} 
        className="editor-content"
      />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;