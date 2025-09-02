import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $getNodeByKey
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $wrapNodes } from '@lexical/selection';
import { $createCodeNode } from '@lexical/code';
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
  Type,
  Heading1,
  Heading2,
  Heading3,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format buttons
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
    }
  }, []);

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
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatHeading = (level) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(`h${level}`));
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createCodeNode());
      }
    });
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: 3,
      columns: 3,
      includeHeaders: true,
    });
  };

  return (
    <div className="toolbar">
      <button
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND)}
        className="toolbar-item"
        aria-label="Undo"
        title="Undo"
      >
        <Undo size={18} />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND)}
        className="toolbar-item"
        aria-label="Redo"
        title="Redo"
      >
        <Redo size={18} />
      </button>
      <div className="divider" />
      
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className={'toolbar-item ' + (isBold ? 'active' : '')}
        aria-label="Format Bold"
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className={'toolbar-item ' + (isItalic ? 'active' : '')}
        aria-label="Format Italics"
        title="Italic"
      >
        <Italic size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        className={'toolbar-item ' + (isUnderline ? 'active' : '')}
        aria-label="Format Underline"
        title="Underline"
      >
        <Underline size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        className={'toolbar-item ' + (isStrikethrough ? 'active' : '')}
        aria-label="Format Strikethrough"
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        className={'toolbar-item ' + (isCode ? 'active' : '')}
        aria-label="Insert Code"
        title="Code"
      >
        <Code size={18} />
      </button>
      <div className="divider" />
      
      <button
        onClick={formatParagraph}
        className="toolbar-item"
        aria-label="Normal"
        title="Normal"
      >
        <Type size={18} />
      </button>
      <button
        onClick={() => formatHeading(1)}
        className="toolbar-item"
        aria-label="Heading 1"
        title="Heading 1"
      >
        <Heading1 size={18} />
      </button>
      <button
        onClick={() => formatHeading(2)}
        className="toolbar-item"
        aria-label="Heading 2"
        title="Heading 2"
      >
        <Heading2 size={18} />
      </button>
      <button
        onClick={() => formatHeading(3)}
        className="toolbar-item"
        aria-label="Heading 3"
        title="Heading 3"
      >
        <Heading3 size={18} />
      </button>
      <div className="divider" />
      
      <button
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND)}
        className="toolbar-item"
        aria-label="Bullet List"
        title="Bullet List"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND)}
        className="toolbar-item"
        aria-label="Numbered List"
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </button>
      <button
        onClick={formatQuote}
        className="toolbar-item"
        aria-label="Quote"
        title="Quote"
      >
        <Quote size={18} />
      </button>
      <div className="divider" />
      
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        className="toolbar-item"
        aria-label="Align Left"
        title="Align Left"
      >
        <AlignLeft size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        className="toolbar-item"
        aria-label="Align Center"
        title="Align Center"
      >
        <AlignCenter size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        className="toolbar-item"
        aria-label="Align Right"
        title="Align Right"
      >
        <AlignRight size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
        className="toolbar-item"
        aria-label="Justify"
        title="Justify"
      >
        <AlignJustify size={18} />
      </button>
      <div className="divider" />
      
      <button
        onClick={insertTable}
        className="toolbar-item"
        aria-label="Insert Table"
        title="Insert Table"
      >
        <Table size={18} />
      </button>
    </div>
  );
}

export default ToolbarPlugin;