import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';

export default function InitialContentPlugin({ value }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!value) return;

    editor.update(() => {
      try {
        // Clear existing content
        const root = $getRoot();
        root.clear();

        // Parse HTML and create nodes
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, 'text/html');
        
        // Generate nodes from DOM
        const nodes = $generateNodesFromDOM(editor, dom);
        
        if (nodes && nodes.length > 0) {
          // Insert the parsed nodes
          root.append(...nodes);
        } else {
          // Fallback: create a paragraph with the text content
          const paragraph = $createParagraphNode();
          const textContent = dom.body.textContent || value;
          paragraph.append($createTextNode(textContent));
          root.append(paragraph);
        }
      } catch (error) {
        console.error('Error setting initial content:', error);
        
        // Fallback: create a simple paragraph with the raw value
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(value));
        root.append(paragraph);
      }
    });
  }, [editor, value]);

  return null;
}