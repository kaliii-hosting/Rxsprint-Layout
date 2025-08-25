import { doc, setDoc, getDoc, collection, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const WORKFLOW_COLLECTION = 'workflow_chunks';
const CHUNK_SIZE = 900000; // 900KB per chunk (safe under 1MB Firestore limit)

// Simple compression using browser's built-in compression
export const compressData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // Use base64 encoding for safer storage
    return btoa(unescape(encodeURIComponent(jsonString)));
  } catch (error) {
    console.error('Compression failed:', error);
    return JSON.stringify(data);
  }
};

export const decompressData = (compressed) => {
  try {
    // Decode from base64
    return JSON.parse(decodeURIComponent(escape(atob(compressed))));
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

// Split large strings into chunks
const splitIntoChunks = (str, maxSize) => {
  const chunks = [];
  for (let i = 0; i < str.length; i += maxSize) {
    chunks.push(str.substring(i, i + maxSize));
  }
  return chunks;
};

// Save workflow data with automatic chunking
export const saveWorkflowData = async (data) => {
  try {
    // Compress the data
    const compressed = compressData(data);
    const dataSize = new Blob([compressed]).size;
    
    console.log(`Saving workflow data: ${(dataSize / 1024).toFixed(1)}KB`);
    
    // Clean up old chunks first
    try {
      const oldChunks = await getDocs(collection(firestore, WORKFLOW_COLLECTION));
      const deletePromises = [];
      oldChunks.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
    } catch (cleanupError) {
      console.log('Cleanup skipped:', cleanupError);
    }
    
    if (dataSize < CHUNK_SIZE) {
      // Small enough for single document
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'), {
        data: compressed,
        isChunked: false,
        timestamp: new Date().toISOString(),
        size: dataSize
      });
      
      console.log('Data saved as single document');
      return { success: true, size: dataSize, chunked: false };
    } else {
      // Need to chunk the data
      const chunks = splitIntoChunks(compressed, CHUNK_SIZE);
      const batch = writeBatch(firestore);
      
      // Save metadata
      batch.set(doc(firestore, WORKFLOW_COLLECTION, 'main'), {
        isChunked: true,
        chunkCount: chunks.length,
        timestamp: new Date().toISOString(),
        totalSize: dataSize
      });
      
      // Save each chunk
      for (let i = 0; i < chunks.length; i++) {
        batch.set(doc(firestore, WORKFLOW_COLLECTION, `chunk_${i}`), {
          data: chunks[i],
          index: i,
          total: chunks.length
        });
      }
      
      await batch.commit();
      console.log(`Data saved as ${chunks.length} chunks`);
      return { success: true, size: dataSize, chunked: true, chunks: chunks.length };
    }
  } catch (error) {
    console.error('Save failed:', error);
    
    // Try to save minimal structure
    try {
      const minimal = {
        lyso: { sections: [] },
        hae: { sections: [] },
        scd: { sections: [] },
        error: 'Save failed - structure only',
        timestamp: new Date().toISOString()
      };
      
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'), minimal);
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
    
    throw error;
  }
};

// Load workflow data with automatic chunk reassembly
export const loadWorkflowData = async () => {
  try {
    const mainDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'));
    
    if (!mainDoc.exists()) {
      console.log('No workflow data found');
      return null;
    }
    
    const mainData = mainDoc.data();
    
    // Check if it's an error state
    if (mainData.error) {
      console.log('Found error state:', mainData.error);
      return mainData;
    }
    
    if (!mainData.isChunked) {
      // Single document
      console.log('Loading single document');
      if (mainData.data) {
        return decompressData(mainData.data);
      }
      return mainData;
    }
    
    // Load and reassemble chunks
    console.log(`Loading ${mainData.chunkCount} chunks...`);
    const chunks = new Array(mainData.chunkCount);
    
    // Load all chunks in parallel
    const chunkPromises = [];
    for (let i = 0; i < mainData.chunkCount; i++) {
      chunkPromises.push(
        getDoc(doc(firestore, WORKFLOW_COLLECTION, `chunk_${i}`))
          .then(chunkDoc => {
            if (chunkDoc.exists()) {
              chunks[i] = chunkDoc.data().data;
            }
          })
      );
    }
    
    await Promise.all(chunkPromises);
    
    // Reassemble and decompress
    const reassembled = chunks.join('');
    const decompressed = decompressData(reassembled);
    
    console.log('Data loaded and reassembled successfully');
    return decompressed;
    
  } catch (error) {
    console.error('Load failed:', error);
    return null;
  }
};

// Save with retry for reliability
export const saveWithRetry = async (data, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        console.log(`Retry attempt ${i}...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
      
      const result = await saveWorkflowData(data);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Save attempt ${i + 1} failed:`, error);
    }
  }
  
  throw lastError;
};

// Local storage backup functions
export const saveToLocalBackup = (data) => {
  try {
    const compressed = compressData(data);
    localStorage.setItem('workflow_backup', compressed);
    localStorage.setItem('workflow_backup_time', new Date().toISOString());
    console.log('Local backup saved');
    return true;
  } catch (error) {
    console.error('Local backup failed:', error);
    return false;
  }
};

export const loadFromLocalBackup = () => {
  try {
    const compressed = localStorage.getItem('workflow_backup');
    const backupTime = localStorage.getItem('workflow_backup_time');
    
    if (compressed) {
      console.log('Local backup found from:', backupTime);
      return decompressData(compressed);
    }
    return null;
  } catch (error) {
    console.error('Local backup load failed:', error);
    return null;
  }
};