import React, { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { $createParagraphNode, $createTextNode, $getRoot, $insertNodes } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

// Import nodes and transformers
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

// Import transformers for markdown
import { TRANSFORMERS } from '@lexical/markdown';

// Import icons
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

// Import CSS
import './LexicalEditor.css';

// Custom plugins
import ToolbarPlugin from './plugins/ToolbarPlugin';
import CustomTablePlugin from './plugins/TablePlugin';
import ExcelPastePlugin from './plugins/ExcelPastePlugin';
import ImagePlugin from './plugins/ImagePlugin';
import InitialContentPlugin from './plugins/InitialContentPlugin';

// Editor configuration
const editorConfig = {
  namespace: 'RxSprintEditor',
  theme: {
    root: 'lexical-editor',
    paragraph: 'lexical-paragraph',
    quote: 'lexical-quote',
    heading: {
      h1: 'lexical-heading-h1',
      h2: 'lexical-heading-h2',
      h3: 'lexical-heading-h3',
      h4: 'lexical-heading-h4',
      h5: 'lexical-heading-h5',
      h6: 'lexical-heading-h6',
    },
    list: {
      nested: {
        listitem: 'lexical-list-item-nested',
      },
      ol: 'lexical-list-ol',
      ul: 'lexical-list-ul',
      listitem: 'lexical-list-item',
    },
    image: 'lexical-image',
    link: 'lexical-link',
    text: {
      bold: 'lexical-text-bold',
      italic: 'lexical-text-italic',
      underline: 'lexical-text-underline',
      strikethrough: 'lexical-text-strikethrough',
      code: 'lexical-text-code',
    },
    code: 'lexical-code',
    codeHighlight: {
      atrule: 'lexical-token-attr-name',
      attr: 'lexical-token-attr-value',
      boolean: 'lexical-token-boolean',
      builtin: 'lexical-token-builtin',
      cdata: 'lexical-token-cdata',
      char: 'lexical-token-char',
      class: 'lexical-token-class',
      'class-name': 'lexical-token-class-name',
      comment: 'lexical-token-comment',
      constant: 'lexical-token-constant',
      deleted: 'lexical-token-deleted',
      doctype: 'lexical-token-doctype',
      entity: 'lexical-token-entity',
      function: 'lexical-token-function',
      important: 'lexical-token-important',
      inserted: 'lexical-token-inserted',
      keyword: 'lexical-token-keyword',
      namespace: 'lexical-token-namespace',
      number: 'lexical-token-number',
      operator: 'lexical-token-operator',
      prolog: 'lexical-token-prolog',
      property: 'lexical-token-property',
      punctuation: 'lexical-token-punctuation',
      regex: 'lexical-token-regex',
      selector: 'lexical-token-selector',
      string: 'lexical-token-string',
      symbol: 'lexical-token-symbol',
      tag: 'lexical-token-tag',
      url: 'lexical-token-url',
      variable: 'lexical-token-variable',
    },
    table: 'lexical-table',
    tableCell: 'lexical-table-cell',
    tableCellHeader: 'lexical-table-cell-header',
  },
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    LinkNode,
    AutoLinkNode,
    TableNode,
    TableCellNode,
    TableRowNode,
  ],
  onError: (error) => {
    console.error('Lexical editor error:', error);
  },
};

// Placeholder component
function Placeholder({ children }) {
  return (
    <div className="lexical-placeholder">
      {children}
    </div>
  );
}

// Main editor component
const LexicalEditor = forwardRef(({ 
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
  const editorRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle content changes
  const handleChange = useCallback((editorState, editor) => {
    editorState.read(() => {
      try {
        const html = $generateHtmlFromNodes(editor, null);
        if (onChange) {
          onChange(html);
        }
      } catch (error) {
        console.error('Error generating HTML:', error);
        // Fallback to text content
        const root = $getRoot();
        const text = root.getTextContent();
        if (onChange) {
          onChange(`<p>${text}</p>`);
        }
      }
    });
  }, [onChange]);

  // Expose editor instance to parent
  useImperativeHandle(ref, () => ({
    editor: editorRef.current,
    container: editorRef.current
  }), []);

  const initialConfig = {
    ...editorConfig,
    editable: !readOnly,
  };

  return (
    <div className={`lexical-editor-container ${className} ${isMobile ? 'mobile' : ''}`}>
      <LexicalComposer initialConfig={initialConfig}>
        {!hideToolbar && (
          <ToolbarPlugin 
            onImageUpload={onImageUpload}
            isMobile={isMobile}
          />
        )}
        <div className="lexical-editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                ref={editorRef}
                className="lexical-content-editable"
                ariaLabel="Rich text editor"
              />
            }
            placeholder={<Placeholder>{placeholder}</Placeholder>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <TablePlugin />
          <CustomTablePlugin />
          <ExcelPastePlugin />
          {onImageUpload && <ImagePlugin onImageUpload={onImageUpload} />}
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <InitialContentPlugin value={value} />
          {!readOnly && <AutoFocusPlugin />}
        </div>
      </LexicalComposer>
    </div>
  );
});

LexicalEditor.displayName = 'LexicalEditor';

export default LexicalEditor;