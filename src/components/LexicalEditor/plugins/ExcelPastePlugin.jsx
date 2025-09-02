import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTableNodeWithDimensions,
  $createTableCellNode,
  $createTableRowNode,
} from '@lexical/table';
import {
  $getSelection,
  $isRangeSelection,
  $insertNodes,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

export default function ExcelPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handlePaste = (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const plainText = clipboardData.getData('text/plain');
      const htmlData = clipboardData.getData('text/html');

      // Check for Excel/table data (HTML table format)
      if (htmlData && (htmlData.includes('<table') || htmlData.includes('<TABLE'))) {
        event.preventDefault();
        
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          try {
            // Parse the HTML to extract table data
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlData;
            const table = tempDiv.querySelector('table');
            
            if (table) {
              const rows = Array.from(table.querySelectorAll('tr'));
              const tableData = [];
              
              rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                const rowData = cells.map(cell => cell.textContent?.trim() || '');
                if (rowData.length > 0) {
                  tableData.push(rowData);
                }
              });
              
              if (tableData.length > 0) {
                const maxColumns = Math.max(...tableData.map(row => row.length));
                const tableNode = $createTableNodeWithDimensions(
                  tableData.length,
                  maxColumns,
                  true // Include headers
                );
                
                $insertNodes([tableNode]);
                
                // TODO: Populate table with actual data
                // This would require more complex node manipulation
              }
            }
          } catch (error) {
            console.error('Error parsing table data:', error);
            // Fallback to plain text insertion
            const paragraphNode = $createParagraphNode();
            paragraphNode.append($createTextNode(plainText));
            $insertNodes([paragraphNode]);
          }
        });
        
        return;
      }

      // Check for tab-separated data (plain text table)
      if (plainText && plainText.includes('\t')) {
        event.preventDefault();
        
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          try {
            const rows = plainText.trim().split('\n');
            const tableData = rows.map(row => row.split('\t').map(cell => cell.trim()));
            
            if (tableData.length > 0 && tableData[0].length > 1) {
              const maxColumns = Math.max(...tableData.map(row => row.length));
              const tableNode = $createTableNodeWithDimensions(
                tableData.length,
                maxColumns,
                true // Include headers
              );
              
              $insertNodes([tableNode]);
              
              // TODO: Populate table with actual data
              // This would require more complex node manipulation
            }
          } catch (error) {
            console.error('Error parsing tab-separated data:', error);
            // Fallback to plain text insertion
            const paragraphNode = $createParagraphNode();
            paragraphNode.append($createTextNode(plainText));
            $insertNodes([paragraphNode]);
          }
        });
        
        return;
      }

      // Handle plain text with preserved line breaks
      if (plainText && !htmlData) {
        event.preventDefault();
        
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          try {
            const paragraphs = plainText.split(/\n\n+/);
            const nodes = [];
            
            paragraphs.forEach(paragraph => {
              if (paragraph.trim()) {
                const lines = paragraph.split('\n');
                if (lines.length > 1) {
                  // Multiple lines - create paragraph with line breaks
                  const paragraphNode = $createParagraphNode();
                  lines.forEach((line, index) => {
                    if (index > 0) {
                      paragraphNode.append($createTextNode('\n'));
                    }
                    paragraphNode.append($createTextNode(line));
                  });
                  nodes.push(paragraphNode);
                } else {
                  // Single line paragraph
                  const paragraphNode = $createParagraphNode();
                  paragraphNode.append($createTextNode(paragraph));
                  nodes.push(paragraphNode);
                }
              }
            });
            
            if (nodes.length === 0 && plainText.trim()) {
              // Fallback: create a single paragraph
              const paragraphNode = $createParagraphNode();
              paragraphNode.append($createTextNode(plainText));
              nodes.push(paragraphNode);
            }
            
            if (nodes.length > 0) {
              $insertNodes(nodes);
            }
          } catch (error) {
            console.error('Error handling plain text paste:', error);
          }
        });
      }
    };

    return mergeRegister(
      editor.registerCommand(
        'PASTE_COMMAND',
        (event) => {
          handlePaste(event);
          return false; // Let other handlers also process
        },
        1
      )
    );
  }, [editor]);

  return null;
}