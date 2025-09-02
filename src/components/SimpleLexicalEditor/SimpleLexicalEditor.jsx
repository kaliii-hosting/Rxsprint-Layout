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
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// Lexical nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';

// Toolbar
import ToolbarPlugin from './ToolbarPlugin';

// Styles
import './SimpleLexicalEditor.css';

// Editor theme configuration - LIGHT THEME
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
};

// Initial plugin to set content
function InitialContentPlugin({ initialContent }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (initialContent) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        
        try {
          // Parse HTML content
          const parser = new DOMParser();
          const dom = parser.parseFromString(initialContent, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);
        } catch (error) {
          // Fallback to plain text
          const paragraph = $createParagraphNode();
          paragraph.append(initialContent);
          root.append(paragraph);
        }
      });
    }
  }, [editor, initialContent]);

  return null;
}

// Excel paste plugin
function ExcelPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      'PASTE',
      (event) => {
        const clipboardData = event.clipboardData || window.clipboardData;
        if (!clipboardData) return false;

        const htmlData = clipboardData.getData('text/html');
        const plainText = clipboardData.getData('text/plain');

        // Check for table data
        if (htmlData && htmlData.includes('<table')) {
          event.preventDefault();
          
          editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(htmlData, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            const root = $getRoot();
            root.append(...nodes);
          });
          
          return true;
        }

        // Check for tab-separated data (Excel plain text)
        if (plainText && plainText.includes('\t')) {
          event.preventDefault();
          
          const rows = plainText.trim().split('\n');
          const tableData = rows.map(row => row.split('\t'));
          
          if (tableData.length > 0) {
            editor.dispatchCommand(INSERT_TABLE_COMMAND, {
              rows: tableData.length,
              columns: tableData[0].length,
              includeHeaders: true,
            });
            
            // TODO: Fill table with data
          }
          
          return true;
        }

        return false;
      },
      1 // High priority
    );
  }, [editor]);

  return null;
}

// Image upload plugin
function ImageUploadPlugin({ onImageUpload }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!onImageUpload) return;

    return editor.registerCommand(
      'PASTE',
      (event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        
        if (imageItem) {
          event.preventDefault();
          const blob = imageItem.getAsFile();
          
          if (blob) {
            onImageUpload(blob).then(url => {
              if (url) {
                editor.update(() => {
                  const root = $getRoot();
                  const paragraph = $createParagraphNode();
                  // For now, just add the URL as text
                  // In production, you'd want to create an ImageNode
                  paragraph.append(`![Image](${url})`);
                  root.append(paragraph);
                });
              }
            });
          }
          
          return true;
        }
        
        return false;
      },
      2 // Lower priority than Excel paste
    );
  }, [editor, onImageUpload]);

  return null;
}

const SimpleLexicalEditor = forwardRef(({ 
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
    namespace: 'RxSprintEditor',
    theme,
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
      LinkNode,
      AutoLinkNode,
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
    <div className={`simple-lexical-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container">
          {!hideToolbar && !readOnly && (
            <ToolbarPlugin />
          )}
          <div className="editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable 
                  className="editor-input"
                  placeholder={placeholder}
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={handleChange} />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <TablePlugin />
            {!readOnly && <AutoFocusPlugin />}
            <InitialContentPlugin initialContent={value} />
            <ExcelPastePlugin />
            {onImageUpload && <ImageUploadPlugin onImageUpload={onImageUpload} />}
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
});

SimpleLexicalEditor.displayName = 'SimpleLexicalEditor';

export default SimpleLexicalEditor;