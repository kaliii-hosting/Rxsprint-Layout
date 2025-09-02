import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { $getRoot, $createParagraphNode } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';

// Lexical nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';

// Toolbar
import BasicToolbar from './BasicToolbar';

// Styles
import './BasicLexicalEditor.css';

// Error boundary fallback
function ErrorBoundary({ children, onError }) {
  return children;
}

// Initial content plugin
function InitialContentPlugin({ initialContent }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    if (!initialContent) return;
    
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      
      try {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialContent, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        if (nodes.length > 0) {
          root.append(...nodes);
        } else {
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        }
      } catch (error) {
        console.error('Error setting initial content:', error);
        const paragraph = $createParagraphNode();
        root.append(paragraph);
      }
    });
  }, []); // Only run once on mount
  
  return null;
}

// Excel paste handler
function ExcelPastePlugin() {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    const handlePaste = (event) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return false;
      
      const htmlData = clipboardData.getData('text/html');
      const textData = clipboardData.getData('text/plain');
      
      // Check for table in HTML
      if (htmlData && htmlData.includes('<table')) {
        event.preventDefault();
        
        editor.update(() => {
          try {
            const parser = new DOMParser();
            const dom = parser.parseFromString(htmlData, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            const root = $getRoot();
            const selection = root.getLastChild();
            if (selection) {
              selection.insertAfter(...nodes);
            } else {
              root.append(...nodes);
            }
          } catch (error) {
            console.error('Error pasting table:', error);
          }
        });
        
        return true;
      }
      
      // Check for tab-separated values (Excel plain text)
      if (textData && textData.includes('\t')) {
        event.preventDefault();
        
        const rows = textData.trim().split('\n');
        const hasMultipleCells = rows.some(row => row.includes('\t'));
        
        if (hasMultipleCells) {
          // Create a table
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            rows: rows.length,
            columns: rows[0].split('\t').length,
            includeHeaders: true,
          });
        }
        
        return true;
      }
      
      return false;
    };
    
    const editorDOM = editor.getRootElement();
    if (editorDOM) {
      editorDOM.addEventListener('paste', handlePaste, true);
      
      return () => {
        editorDOM.removeEventListener('paste', handlePaste, true);
      };
    }
  }, [editor]);
  
  return null;
}

const BasicLexicalEditor = forwardRef(({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...', 
  readOnly = false,
  onImageUpload,
  className = '',
  hideToolbar = false
}, ref) => {
  const editorRef = useRef(null);
  
  // Editor configuration
  const initialConfig = {
    namespace: 'BasicEditor',
    theme: {
      // Simple theme classes
      paragraph: 'editor-paragraph',
      text: {
        bold: 'editor-bold',
        italic: 'editor-italic',
        underline: 'editor-underline',
        strikethrough: 'editor-strikethrough',
        code: 'editor-code',
      },
      heading: {
        h1: 'editor-h1',
        h2: 'editor-h2',
        h3: 'editor-h3',
      },
      list: {
        ul: 'editor-ul',
        ol: 'editor-ol',
        listitem: 'editor-li',
      },
      quote: 'editor-quote',
      table: 'editor-table',
      tableCell: 'editor-table-cell',
      tableCellHeader: 'editor-table-cell-header',
    },
    onError: (error) => {
      console.error('Lexical error:', error);
    },
    editable: !readOnly,
    nodes: [
      HeadingNode,
      QuoteNode,
      CodeNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      ListNode,
      ListItemNode,
    ],
  };
  
  // Handle content changes
  const handleChange = (editorState, editor) => {
    editor.read(() => {
      const html = $generateHtmlFromNodes(editor);
      if (onChange) {
        onChange(html);
      }
    });
  };
  
  // Expose editor instance
  useImperativeHandle(ref, () => ({
    editor: editorRef.current,
    focus: () => {
      editorRef.current?.focus();
    },
  }), []);
  
  return (
    <div className={`basic-lexical-editor ${className} ${readOnly ? 'read-only' : ''}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-shell">
          {!hideToolbar && !readOnly && (
            <BasicToolbar />
          )}
          <div className="editor-container">
            <RichTextPlugin
              contentEditable={
                <ContentEditable 
                  className="editor-content"
                  placeholder={placeholder}
                />
              }
              ErrorBoundary={ErrorBoundary}
            />
            <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
            <HistoryPlugin />
            <ListPlugin />
            <TablePlugin />
            <TabIndentationPlugin />
            <InitialContentPlugin initialContent={value} />
            <ExcelPastePlugin />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
});

BasicLexicalEditor.displayName = 'BasicLexicalEditor';

export default BasicLexicalEditor;