import { doc, setDoc, getDoc, collection, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const WORKFLOW_COLLECTION = 'workflow_data_chunks';
const CHUNK_SIZE = 800000; // 800KB per chunk (safe under 1MB limit)

// Simple compression using base64
export const compressData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonString)));
  } catch (error) {
    console.error('Compression failed:', error);
    return JSON.stringify(data);
  }
};

export const decompressData = (compressed) => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(compressed))));
  } catch (error) {
    try {
      return JSON.parse(compressed);
    } catch (jsonError) {
      console.error('Decompression failed:', error);
      return null;
    }
  }
};

// Split data into chunks if needed
const chunkString = (str, size) => {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.substring(i, i + size));
  }
  return chunks;
};

// Save to Firestore with automatic chunking
export const saveWorkflowToFirestore = async (data) => {
  try {
    const compressed = compressData(data);
    const dataSize = new Blob([compressed]).size;
    
    console.log(`Saving to Firestore: ${(dataSize / 1024).toFixed(1)}KB`);
    
    // Delete old chunks first
    try {
      const oldChunks = await getDocs(collection(firestore, WORKFLOW_COLLECTION));
      const deletePromises = [];
      oldChunks.forEach(doc => {
        if (doc.id !== 'metadata') {
          deletePromises.push(deleteDoc(doc.ref));
        }
      });
      await Promise.all(deletePromises);
    } catch (cleanupError) {
      console.log('Cleanup skipped:', cleanupError);
    }
    
    if (dataSize < CHUNK_SIZE) {
      // Single document
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'), {
        data: compressed,
        chunked: false,
        size: dataSize,
        timestamp: new Date().toISOString()
      });
      
      console.log('Saved as single document to Firestore');
    } else {
      // Need to chunk
      const chunks = chunkString(compressed, CHUNK_SIZE);
      const batch = writeBatch(firestore);
      
      // Save metadata
      batch.set(doc(firestore, WORKFLOW_COLLECTION, 'metadata'), {
        chunked: true,
        chunkCount: chunks.length,
        totalSize: dataSize,
        timestamp: new Date().toISOString()
      });
      
      // Save chunks
      chunks.forEach((chunk, index) => {
        batch.set(doc(firestore, WORKFLOW_COLLECTION, `chunk_${index}`), {
          data: chunk,
          index: index,
          total: chunks.length
        });
      });
      
      await batch.commit();
      console.log(`Saved as ${chunks.length} chunks to Firestore`);
    }
    
    return { success: true, size: dataSize };
    
  } catch (error) {
    console.error('Firestore save failed:', error);
    throw error;
  }
};

// Load from Firestore with chunk reassembly
export const loadWorkflowFromFirestore = async () => {
  try {
    // Check for single document first
    const mainDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'));
    if (mainDoc.exists()) {
      const mainData = mainDoc.data();
      if (!mainData.chunked && mainData.data) {
        console.log('Loaded single document from Firestore');
        return decompressData(mainData.data);
      }
    }
    
    // Check for chunked data
    const metadataDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, 'metadata'));
    if (metadataDoc.exists()) {
      const metadata = metadataDoc.data();
      if (metadata.chunked && metadata.chunkCount) {
        console.log(`Loading ${metadata.chunkCount} chunks from Firestore...`);
        
        const chunks = [];
        const chunkPromises = [];
        
        for (let i = 0; i < metadata.chunkCount; i++) {
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
        
        const reassembled = chunks.join('');
        console.log('Chunks reassembled successfully');
        return decompressData(reassembled);
      }
    }
    
    // Try legacy locations as fallback
    console.log('Checking legacy data locations...');
    
    // Check workflow/data
    const legacyDoc = await getDoc(doc(firestore, 'workflow/data'));
    if (legacyDoc.exists()) {
      const data = legacyDoc.data();
      console.log('Found legacy data in workflow/data');
      
      if (data.type === 'compressed' && data.data) {
        return decompressData(data.data);
      }
      return data;
    }
    
    // Check workflow_chunks
    const legacyChunks = await getDoc(doc(firestore, 'workflow_chunks/main'));
    if (legacyChunks.exists()) {
      const data = legacyChunks.data();
      console.log('Found legacy data in workflow_chunks');
      
      if (data.data) {
        return decompressData(data.data);
      }
      return data;
    }
    
    return null;
    
  } catch (error) {
    console.error('Firestore load failed:', error);
    return null;
  }
};

// Save with retry
export const saveWithRetry = async (data, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        console.log(`Retry attempt ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
      
      const result = await saveWorkflowToFirestore(data);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Save attempt ${i + 1} failed:`, error);
    }
  }
  
  throw lastError;
};

// Local storage backup
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
    if (compressed) {
      const backupTime = localStorage.getItem('workflow_backup_time');
      console.log('Local backup found from:', backupTime);
      return decompressData(compressed);
    }
    return null;
  } catch (error) {
    console.error('Local backup load failed:', error);
    return null;
  }
};