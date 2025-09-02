import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import {
  $createTableNodeWithDimensions,
  INSERT_TABLE_COMMAND,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
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
  Table as TableIcon,
} from 'lucide-react';

import './ToolbarPlugin.css';

export default function ToolbarPlugin({ onImageUpload, isMobile = false }) {
  const [editor] = useLexicalComposerContext();
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  });
  const [blockType, setBlockType] = useState('paragraph');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update active states for text formatting
      setActiveStates({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        strikethrough: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
      });

      // Update block type
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = element;
          const type = parentList.getListType();
          setBlockType(type);
        } else {
          const type = element.getType();
          setBlockType(type);
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          updateToolbar();
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const formatText = useCallback(
    (format) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const formatHeading = useCallback(
    (headingSize) => {
      if (blockType !== headingSize) {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const headingNode = $createHeadingNode(headingSize);
            selection.insertNodes([headingNode]);
          }
        });
      }
    },
    [editor, blockType]
  );

  const formatQuote = useCallback(() => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const quoteNode = $createQuoteNode();
          selection.insertNodes([quoteNode]);
        }
      });
    }
  }, [editor, blockType]);

  const formatCodeBlock = useCallback(() => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const codeNode = $createCodeNode();
          selection.insertNodes([codeNode]);
        }
      });
    }
  }, [editor, blockType]);

  const formatBulletList = useCallback(() => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  }, [editor, blockType]);

  const formatOrderedList = useCallback(() => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  }, [editor, blockType]);

  const insertTable = useCallback(() => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: '3',
      rows: '3',
      includeHeaders: true,
    });
  }, [editor]);

  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const url = await onImageUpload(file);
          if (url) {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                // For now, we'll insert as text. In a full implementation,
                // we'd create a custom ImageNode
                selection.insertText(`[Image: ${url}]`);
              }
            });
          }
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
      }
    };
    
    input.click();
  }, [editor, onImageUpload]);

  const ToolbarButton = ({ onClick, isActive, children, title, disabled = false }) => (
    <button
      onClick={onClick}
      className={`toolbar-btn ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      title={title}
      type="button"
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );

  return (
    <div className="lexical-toolbar">
      {/* Text formatting */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => formatText('bold')}
          isActive={activeStates.bold}
          title="Bold"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatText('italic')}
          isActive={activeStates.italic}
          title="Italic"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatText('underline')}
          isActive={activeStates.underline}
          title="Underline"
        >
          <Underline size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatText('strikethrough')}
          isActive={activeStates.strikethrough}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => formatText('code')}
          isActive={activeStates.code}
          title="Code"
        >
          <Code size={18} />
        </ToolbarButton>
      </div>

      {/* Headings - desktop only */}
      {!isMobile && (
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => formatHeading('h1')}
            isActive={blockType === 'h1'}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => formatHeading('h2')}
            isActive={blockType === 'h2'}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => formatHeading('h3')}
            isActive={blockType === 'h3'}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </ToolbarButton>
        </div>
      )}

      {/* Lists and Quote */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={formatBulletList}
          isActive={blockType === 'bullet'}
          title="Bullet List"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={formatOrderedList}
          isActive={blockType === 'number'}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </ToolbarButton>
        {!isMobile && (
          <ToolbarButton
            onClick={formatQuote}
            isActive={blockType === 'quote'}
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
          onClick={insertTable}
          title="Insert Table"
        >
          <TableIcon size={18} />
        </ToolbarButton>
      </div>

      {/* History - desktop only */}
      {!isMobile && (
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => editor.dispatchCommand('UNDO_COMMAND', undefined)}
            title="Undo"
            disabled={!canUndo}
          >
            <Undo size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.dispatchCommand('REDO_COMMAND', undefined)}
            title="Redo"
            disabled={!canRedo}
          >
            <Redo size={18} />
          </ToolbarButton>
        </div>
      )}
    </div>
  );
}