import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $insertNodes,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

export default function ImagePlugin({ onImageUpload }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!onImageUpload) return;

    const handlePaste = async (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = Array.from(clipboardData.items || []);
      const imageItem = items.find(item => item.type && item.type.startsWith('image/'));

      if (imageItem) {
        event.preventDefault();
        event.stopPropagation();
        
        const blob = imageItem.getAsFile();
        if (blob) {
          try {
            console.log('Pasting image, size:', blob.size, 'type:', blob.type);
            const url = await onImageUpload(blob, true);
            
            if (url) {
              console.log('Image uploaded, inserting into editor:', url);
              
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  // For now, we'll insert as text. In a full implementation,
                  // we'd create a custom ImageNode
                  const paragraphNode = $createParagraphNode();
                  paragraphNode.append($createTextNode(`[Image: ${url}]`));
                  $insertNodes([paragraphNode]);
                }
              });
            } else {
              console.warn('No URL returned from image upload');
            }
          } catch (error) {
            console.error('Failed to upload pasted image:', error);
            // Don't show alert for CORS errors, they're expected in development
            if (!error.message?.includes('CORS')) {
              alert('Failed to upload image. Please try again.');
            }
          }
        }
      }
    };

    return mergeRegister(
      editor.registerCommand(
        'PASTE_COMMAND',
        (event) => {
          handlePaste(event);
          return false; // Let other handlers also process
        },
        2 // Higher priority for image handling
      )
    );
  }, [editor, onImageUpload]);

  return null;
}