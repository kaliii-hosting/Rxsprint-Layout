import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { firestore, storage } from '../config/firebase';

const STORAGE_PATH = 'workflow-data/workflow-data.json';
const FIRESTORE_COLLECTION = 'workflow_data';
const CHUNK_SIZE = 800000; // 800KB for Firestore chunks

// Compression utilities
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

// Convert string to Uint8Array for Firebase Storage
const stringToBytes = (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

// Convert Uint8Array to string
const bytesToString = (bytes) => {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

// Save with hybrid approach - try Storage first, fallback to Firestore
export const saveWorkflowHybrid = async (data) => {
  try {
    const compressed = compressData(data);
    const dataSize = new Blob([compressed]).size;
    
    console.log(`Saving workflow data: ${(dataSize / 1024).toFixed(1)}KB`);
    
    let storageSuccess = false;
    let firestoreSuccess = false;
    
    // 1. Try Firebase Storage (using uploadBytes to avoid CORS)
    if (storage) {
      try {
        const storageRef = ref(storage, STORAGE_PATH);
        const bytes = stringToBytes(compressed);
        const blob = new Blob([bytes], { type: 'application/json' });
        
        await uploadBytes(storageRef, blob);
        storageSuccess = true;
        console.log('✓ Saved to Firebase Storage');
        
        // Save metadata to Firestore
        await setDoc(doc(firestore, FIRESTORE_COLLECTION, 'metadata'), {
          storage: true,
          size: dataSize,
          timestamp: new Date().toISOString()
        });
        
      } catch (storageError) {
        console.log('Firebase Storage failed:', storageError.message);
      }
    }
    
    // 2. Always save to Firestore as backup or primary if Storage fails
    if (!storageSuccess) {
      try {
        if (dataSize < CHUNK_SIZE) {
          // Single document
          await setDoc(doc(firestore, FIRESTORE_COLLECTION, 'data'), {
            type: 'compressed',
            data: compressed,
            size: dataSize,
            timestamp: new Date().toISOString()
          });
          firestoreSuccess = true;
          console.log('✓ Saved to Firestore (single document)');
          
        } else {
          // Need to chunk for large data
          const chunks = [];
          for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
            chunks.push(compressed.substring(i, i + CHUNK_SIZE));
          }
          
          // Delete old chunks
          const oldChunks = await getDocs(collection(firestore, `${FIRESTORE_COLLECTION}_chunks`));
          for (const doc of oldChunks.docs) {
            await deleteDoc(doc.ref);
          }
          
          // Save new chunks
          await setDoc(doc(firestore, FIRESTORE_COLLECTION, 'metadata'), {
            chunked: true,
            chunkCount: chunks.length,
            size: dataSize,
            timestamp: new Date().toISOString()
          });
          
          for (let i = 0; i < chunks.length; i++) {
            await setDoc(doc(firestore, `${FIRESTORE_COLLECTION}_chunks`, `chunk_${i}`), {
              data: chunks[i],
              index: i
            });
          }
          
          firestoreSuccess = true;
          console.log(`✓ Saved to Firestore (${chunks.length} chunks)`);
        }
      } catch (firestoreError) {
        console.error('Firestore save failed:', firestoreError);
      }
    }
    
    if (!storageSuccess && !firestoreSuccess) {
      throw new Error('Failed to save to both Storage and Firestore');
    }
    
    return {
      success: true,
      size: dataSize,
      method: storageSuccess ? 'storage' : 'firestore'
    };
    
  } catch (error) {
    console.error('Save failed:', error);
    throw error;
  }
};

// Load with hybrid approach - try Storage first, fallback to Firestore
export const loadWorkflowHybrid = async () => {
  try {
    // 1. Try Firebase Storage first (using getBytes to avoid CORS)
    if (storage) {
      try {
        const storageRef = ref(storage, STORAGE_PATH);
        const bytes = await getBytes(storageRef);
        const compressed = bytesToString(bytes);
        const data = decompressData(compressed);
        
        console.log('✓ Loaded from Firebase Storage');
        return data;
        
      } catch (storageError) {
        console.log('Firebase Storage load failed:', storageError.message);
      }
    }
    
    // 2. Try Firestore single document
    try {
      const dataDoc = await getDoc(doc(firestore, FIRESTORE_COLLECTION, 'data'));
      if (dataDoc.exists()) {
        const docData = dataDoc.data();
        if (docData.type === 'compressed' && docData.data) {
          const data = decompressData(docData.data);
          console.log('✓ Loaded from Firestore (single document)');
          return data;
        }
      }
    } catch (error) {
      console.log('Firestore single doc load failed');
    }
    
    // 3. Try Firestore chunks
    try {
      const metadataDoc = await getDoc(doc(firestore, FIRESTORE_COLLECTION, 'metadata'));
      if (metadataDoc.exists()) {
        const metadata = metadataDoc.data();
        
        if (metadata.chunked && metadata.chunkCount) {
          const chunks = [];
          for (let i = 0; i < metadata.chunkCount; i++) {
            const chunkDoc = await getDoc(doc(firestore, `${FIRESTORE_COLLECTION}_chunks`, `chunk_${i}`));
            if (chunkDoc.exists()) {
              chunks[i] = chunkDoc.data().data;
            }
          }
          
          const compressed = chunks.join('');
          const data = decompressData(compressed);
          console.log(`✓ Loaded from Firestore (${metadata.chunkCount} chunks)`);
          return data;
        }
      }
    } catch (error) {
      console.log('Firestore chunks load failed');
    }
    
    // 4. Check legacy locations
    console.log('Checking legacy data locations...');
    
    // Legacy workflow/data
    try {
      const legacyDoc = await getDoc(doc(firestore, 'workflow/data'));
      if (legacyDoc.exists()) {
        const data = legacyDoc.data();
        if (data.type === 'compressed' && data.data) {
          console.log('✓ Loaded from legacy location');
          return decompressData(data.data);
        }
        return data;
      }
    } catch (error) {
      console.log('Legacy location check failed');
    }
    
    // Legacy workflow_data_chunks
    try {
      const legacyMain = await getDoc(doc(firestore, 'workflow_data_chunks/main'));
      if (legacyMain.exists() && legacyMain.data().data) {
        console.log('✓ Loaded from legacy chunks');
        return decompressData(legacyMain.data().data);
      }
    } catch (error) {
      console.log('Legacy chunks check failed');
    }
    
    return null;
    
  } catch (error) {
    console.error('Load failed:', error);
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
      
      const result = await saveWorkflowHybrid(data);
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
    console.log('✓ Local backup saved');
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
      console.log('✓ Local backup found from:', backupTime);
      return decompressData(compressed);
    }
    return null;
  } catch (error) {
    console.error('Local backup load failed:', error);
    return null;
  }
};