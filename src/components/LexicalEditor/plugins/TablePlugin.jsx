import React, { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTableNodeWithDimensions,
  $isTableNode,
  $isTableCellNode,
  $isTableRowNode,
  TableNode,
  TableCellNode,
  TableRowNode,
} from '@lexical/table';
import { $insertNodes, $getSelection, $isRangeSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';

export default function TablePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TableNode, TableCellNode, TableRowNode])) {
      console.error('TablePlugin: TableNode, TableCellNode or TableRowNode not registered');
      return;
    }

    return mergeRegister(
      // Handle table-specific commands and behaviors
      editor.registerCommand(
        'INSERT_TABLE_COMMAND',
        ({ columns = '3', rows = '3', includeHeaders = true }) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          const tableNode = $createTableNodeWithDimensions(
            parseInt(rows, 10),
            parseInt(columns, 10),
            includeHeaders
          );

          $insertNodes([tableNode]);
          
          return true;
        },
        1
      )
    );
  }, [editor]);

  return null;
}