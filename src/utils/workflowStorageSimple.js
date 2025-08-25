import { doc, setDoc, getDoc, collection, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import pako from 'pako'; // npm install pako (reliable compression library)

const WORKFLOW_COLLECTION = 'workflow_data';
const CHUNK_SIZE = 800000; // 800KB per chunk (safe under 1MB limit)

// Simple compression using pako (gzip)
export const compressData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = pako.deflate(jsonString, { to: 'string' });
    return btoa(compressed); // Base64 encode for Firestore
  } catch (error) {
    console.error('Compression failed:', error);
    return JSON.stringify(data); // Fallback to uncompressed
  }
};

export const decompressData = (compressed) => {
  try {
    const decoded = atob(compressed); // Base64 decode
    const decompressed = pako.inflate(decoded, { to: 'string' });
    return JSON.parse(decompressed);
  } catch (error) {
    // Try as regular JSON if decompression fails
    try {
      return JSON.parse(compressed);
    } catch (jsonError) {
      console.error('Decompression failed:', error);
      return null;
    }
  }
};

// Split data into chunks if needed
export const chunkString = (str, size) => {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.substring(i, i + size));
  }
  return chunks;
};

// Save with automatic chunking
export const saveWorkflowSimple = async (data) => {
  try {
    // Compress the data
    const compressed = compressData(data);
    const dataSize = new Blob([compressed]).size;
    
    console.log(`Data size: ${(dataSize / 1024).toFixed(1)}KB`);
    
    // Clean up old chunks first
    const oldChunks = await getDocs(collection(firestore, WORKFLOW_COLLECTION));
    const batch = writeBatch(firestore);
    oldChunks.forEach(doc => batch.delete(doc.ref));
    
    if (dataSize < CHUNK_SIZE) {
      // Small enough for single document
      batch.set(doc(firestore, WORKFLOW_COLLECTION, 'main'), {
        data: compressed,
        chunked: false,
        timestamp: new Date().toISOString(),
        size: dataSize
      });
    } else {
      // Need to chunk
      const chunks = chunkString(compressed, CHUNK_SIZE);
      
      // Save metadata
      batch.set(doc(firestore, WORKFLOW_COLLECTION, 'main'), {
        chunked: true,
        chunkCount: chunks.length,
        timestamp: new Date().toISOString(),
        totalSize: dataSize
      });
      
      // Save chunks
      chunks.forEach((chunk, index) => {
        batch.set(doc(firestore, WORKFLOW_COLLECTION, `chunk_${index}`), {
          data: chunk,
          index: index,
          total: chunks.length
        });
      });
      
      console.log(`Data chunked into ${chunks.length} parts`);
    }
    
    await batch.commit();
    return { success: true, size: dataSize, chunked: dataSize >= CHUNK_SIZE };
    
  } catch (error) {
    console.error('Save failed:', error);
    
    // Try to save at least the structure
    try {
      const minimal = {
        lyso: { sections: [] },
        hae: { sections: [] },
        scd: { sections: [] },
        error: 'Data too large - structure saved only',
        timestamp: new Date().toISOString()
      };
      
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'), minimal);
      throw new Error('Data too large. Only structure was saved. Please reduce content size.');
    } catch (fallbackError) {
      throw error;
    }
  }
};

// Load with automatic chunk reassembly
export const loadWorkflowSimple = async () => {
  try {
    const mainDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'));
    
    if (!mainDoc.exists()) {
      return null;
    }
    
    const mainData = mainDoc.data();
    
    if (!mainData.chunked) {
      // Single document
      if (mainData.data) {
        return decompressData(mainData.data);
      }
      // Old format or error state
      return mainData;
    }
    
    // Load and reassemble chunks
    const chunks = [];
    for (let i = 0; i < mainData.chunkCount; i++) {
      const chunkDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, `chunk_${i}`));
      if (chunkDoc.exists()) {
        chunks[i] = chunkDoc.data().data;
      }
    }
    
    const reassembled = chunks.join('');
    return decompressData(reassembled);
    
  } catch (error) {
    console.error('Load failed:', error);
    return null;
  }
};

// Add retry wrapper for reliability
export const saveWithRetry = async (data, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await saveWorkflowSimple(data);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`Save attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
  
  throw lastError;
};

// Add local storage backup
export const saveToLocalStorage = (data) => {
  try {
    const compressed = compressData(data);
    localStorage.setItem('workflow_backup', compressed);
    localStorage.setItem('workflow_backup_time', new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Local storage save failed:', error);
    return false;
  }
};

export const loadFromLocalStorage = () => {
  try {
    const compressed = localStorage.getItem('workflow_backup');
    if (compressed) {
      return decompressData(compressed);
    }
    return null;
  } catch (error) {
    console.error('Local storage load failed:', error);
    return null;
  }
};