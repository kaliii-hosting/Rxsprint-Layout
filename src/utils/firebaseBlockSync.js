// Firebase sync for block-based notes
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { firestore as db } from '../config/firebase';

// Save note with blocks structure
export const saveNoteWithBlocks = async (noteId, noteData) => {
  try {
    const noteRef = doc(db, 'notes', noteId);
    
    // Convert blocks to storable format
    const dataToSave = {
      ...noteData,
      blocks: noteData.blocks || [],
      content: noteData.content || '', // Keep HTML for backward compatibility
      updatedAt: serverTimestamp(),
      version: '2.0' // Indicate this is block-based
    };
    
    await updateDoc(noteRef, dataToSave);
    return { success: true };
  } catch (error) {
    console.error('Error saving note with blocks:', error);
    return { success: false, error };
  }
};

// Create new note with blocks
export const createNoteWithBlocks = async (noteData) => {
  try {
    const notesRef = collection(db, 'notes');
    const newNoteRef = doc(notesRef);
    
    const dataToSave = {
      ...noteData,
      blocks: noteData.blocks || [],
      content: noteData.content || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: '2.0'
    };
    
    await setDoc(newNoteRef, dataToSave);
    return { success: true, id: newNoteRef.id };
  } catch (error) {
    console.error('Error creating note with blocks:', error);
    return { success: false, error };
  }
};

// Load note and convert to blocks if needed
export const loadNoteWithBlocks = async (noteId) => {
  try {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return { success: false, error: 'Note not found' };
    }
    
    const noteData = noteSnap.data();
    
    // Check if note has blocks structure
    if (noteData.version === '2.0' && noteData.blocks) {
      // Already in block format
      return { success: true, data: noteData };
    } else {
      // Convert legacy note to blocks
      const blocks = convertLegacyNoteToBlocks(noteData);
      
      // Optionally update the note in Firebase
      // await updateDoc(noteRef, { blocks, version: '2.0' });
      
      return { 
        success: true, 
        data: { ...noteData, blocks },
        converted: true 
      };
    }
  } catch (error) {
    console.error('Error loading note with blocks:', error);
    return { success: false, error };
  }
};

// Convert legacy note format to blocks
function convertLegacyNoteToBlocks(noteData) {
  const blocks = [];
  let order = 1;
  
  // Convert banners to blocks
  if (noteData.banners && noteData.banners.length > 0) {
    noteData.banners.forEach(banner => {
      blocks.push({
        id: banner.id || `banner-${Date.now()}-${order}`,
        type: banner.isCallout ? 'callout' : banner.isTitle ? 'title' : 'banner',
        content: {
          text: banner.text,
          color: banner.color || 'blue',
          newLine: banner.newLine,
          isDone: banner.isDone
        },
        order: order++,
        createdAt: banner.createdAt || new Date().toISOString()
      });
    });
  }
  
  // Convert HTML content to blocks
  if (noteData.content) {
    const contentBlocks = parseHtmlToBlocks(noteData.content, order);
    blocks.push(...contentBlocks);
  }
  
  // If no blocks created, add default text block
  if (blocks.length === 0) {
    blocks.push({
      id: `text-${Date.now()}`,
      type: 'text',
      content: '<p>Start typing...</p>',
      order: 1,
      createdAt: new Date().toISOString()
    });
  }
  
  return blocks;
}

// Parse HTML content into blocks
function parseHtmlToBlocks(htmlContent, startOrder = 1) {
  if (!htmlContent) return [];
  
  const blocks = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  let order = startOrder;
  let currentTextContent = '';
  
  const processNode = (node) => {
    // Skip banner elements (already processed)
    if (node.classList?.contains('content-banner-item')) {
      return;
    }
    
    // Handle tables
    if (node.tagName === 'TABLE') {
      // Save any accumulated text first
      if (currentTextContent.trim()) {
        blocks.push({
          id: `text-${Date.now()}-${order}`,
          type: 'text',
          content: currentTextContent,
          order: order++,
          createdAt: new Date().toISOString()
        });
        currentTextContent = '';
      }
      
      // Add table block
      blocks.push({
        id: `table-${Date.now()}-${order}`,
        type: 'table',
        content: {
          html: node.outerHTML,
          rows: node.querySelectorAll('tr').length,
          columns: node.querySelector('tr')?.querySelectorAll('td, th').length || 0
        },
        order: order++,
        createdAt: new Date().toISOString()
      });
    }
    // Handle images
    else if (node.tagName === 'IMG') {
      // Save any accumulated text first
      if (currentTextContent.trim()) {
        blocks.push({
          id: `text-${Date.now()}-${order}`,
          type: 'text',
          content: currentTextContent,
          order: order++,
          createdAt: new Date().toISOString()
        });
        currentTextContent = '';
      }
      
      // Add image block
      blocks.push({
        id: `image-${Date.now()}-${order}`,
        type: 'image',
        content: {
          src: node.src,
          alt: node.alt || ''
        },
        order: order++,
        createdAt: new Date().toISOString()
      });
    }
    // Accumulate text content
    else {
      currentTextContent += node.outerHTML || node.textContent || '';
    }
  };
  
  // Process all child nodes
  Array.from(doc.body.children).forEach(processNode);
  
  // Add remaining text content
  if (currentTextContent.trim()) {
    blocks.push({
      id: `text-${Date.now()}-${order}`,
      type: 'text',
      content: currentTextContent,
      order: order++,
      createdAt: new Date().toISOString()
    });
  }
  
  return blocks;
}

// Batch update blocks
export const updateBlocks = async (noteId, blocks) => {
  try {
    const noteRef = doc(db, 'notes', noteId);
    
    await updateDoc(noteRef, {
      blocks: blocks,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating blocks:', error);
    return { success: false, error };
  }
};

// Auto-save with debouncing
let saveTimeout = null;
export const autoSaveBlocks = (noteId, blocks, delay = 2000) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    await updateBlocks(noteId, blocks);
  }, delay);
};

// Export note data for compatibility
export const exportNoteData = (blocks) => {
  // Convert blocks back to HTML for export/compatibility
  const htmlContent = blocks.map(block => {
    switch (block.type) {
      case 'text':
        return block.content || '';
      
      case 'banner':
      case 'callout':
      case 'title':
        const bannerClass = block.type === 'callout' ? 'callout-banner' : 
                           block.type === 'title' ? 'title-banner' : 
                           `banner-${block.content?.color || 'blue'}`;
        return `<div class="content-banner-item ${bannerClass}">
          <span class="banner-text">${block.content?.text || ''}</span>
        </div>`;
      
      case 'table':
        return block.content?.html || '';
      
      case 'image':
        return `<img src="${block.content?.src}" alt="${block.content?.alt || ''}" />`;
      
      case 'code':
        return `<pre><code class="language-${block.content?.language || 'plaintext'}">${block.content?.code || ''}</code></pre>`;
      
      default:
        return '';
    }
  }).join('\n');
  
  return htmlContent;
};