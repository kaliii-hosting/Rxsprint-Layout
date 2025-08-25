import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, getBytes } from 'firebase/storage';
import { firestore, storage } from '../config/firebase';

const STORAGE_PATH = 'workflow-data/workflow-data.json';
const FIRESTORE_DOC = 'workflow/metadata';

// Simple compression for smaller uploads
export const compressData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // Basic base64 encoding for safer transmission
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
    // Try as regular JSON if decompression fails
    try {
      return JSON.parse(compressed);
    } catch (jsonError) {
      console.error('Decompression failed:', error);
      return null;
    }
  }
};

// Save directly to Firebase Storage (no auth, no chunking)
export const saveWorkflowToStorage = async (data) => {
  try {
    // Compress the data
    const compressed = compressData(data);
    const dataSize = new Blob([compressed]).size;
    
    console.log(`Saving data: ${(dataSize / 1024).toFixed(1)}KB`);
    
    // Save to BOTH Storage and Firestore for redundancy
    let storageSuccess = false;
    let firestoreSuccess = false;
    
    // 1. Try Firebase Storage
    try {
      const storageRef = ref(storage, STORAGE_PATH);
      await uploadString(storageRef, compressed, 'raw');
      storageSuccess = true;
      console.log('Saved to Firebase Storage');
    } catch (storageError) {
      console.log('Storage save failed:', storageError.code);
    }
    
    // 2. Always save to Firestore as backup (especially if Storage fails)
    try {
      if (dataSize < 900000) { // Under 900KB - safe for Firestore
        await setDoc(doc(firestore, 'workflow/data'), {
          type: 'compressed',
          data: compressed,
          size: dataSize,
          timestamp: new Date().toISOString(),
          storageSuccess: storageSuccess
        });
        firestoreSuccess = true;
        console.log('Saved to Firestore as backup');
      } else {
        // Too large for single doc, just save metadata
        await setDoc(doc(firestore, FIRESTORE_DOC), {
          size: dataSize,
          timestamp: new Date().toISOString(),
          type: 'storage',
          storageSuccess: storageSuccess
        });
        console.log('Saved metadata to Firestore');
      }
    } catch (firestoreError) {
      console.log('Firestore save failed:', firestoreError);
    }
    
    if (!storageSuccess && !firestoreSuccess) {
      throw new Error('Failed to save to both Storage and Firestore');
    }
    
    console.log('Save completed successfully');
    return { 
      success: true, 
      size: dataSize,
      storage: storageSuccess,
      firestore: firestoreSuccess
    };
    
  } catch (error) {
    console.error('Firebase Storage save failed:', error);
    throw error;
  }
};

// Load directly from Firebase Storage
export const loadWorkflowFromStorage = async () => {
  try {
    // Get data directly from Firebase Storage using SDK (avoids CORS)
    const storageRef = ref(storage, STORAGE_PATH);
    
    try {
      // Use getBytes instead of getDownloadURL + fetch to avoid CORS
      const bytes = await getBytes(storageRef);
      
      // Convert bytes to string
      const decoder = new TextDecoder();
      const compressed = decoder.decode(bytes);
      
      const data = decompressData(compressed);
      console.log('Successfully loaded from Firebase Storage');
      return data;
      
    } catch (storageError) {
      // If direct load fails, try with metadata URL (fallback)
      console.log('Direct storage load failed, trying metadata:', storageError.code);
      
      const metadataDoc = await getDoc(doc(firestore, FIRESTORE_DOC));
      if (metadataDoc.exists() && metadataDoc.data().type === 'storage') {
        // Data exists but can't be loaded directly, return a marker
        console.log('Data exists in storage but cannot be loaded due to CORS/permissions');
        
        // Try to get from Firestore backup if available
        const fallbackDoc = await getDoc(doc(firestore, 'workflow/data'));
        if (fallbackDoc.exists()) {
          const data = fallbackDoc.data();
          if (data.type === 'compressed' && data.data) {
            return decompressData(data.data);
          }
          return data;
        }
      }
      throw storageError;
    }
    
  } catch (error) {
    console.error('Firebase Storage load failed:', error);
    
    // Try multiple fallback locations
    // 1. Check the old Firestore location
    try {
      const fallbackDoc = await getDoc(doc(firestore, 'workflow/data'));
      if (fallbackDoc.exists()) {
        const data = fallbackDoc.data();
        console.log('Found fallback data in Firestore workflow/data');
        
        // Check if it's compressed data
        if (data.type === 'compressed' && data.data) {
          return decompressData(data.data);
        }
        
        // Return raw data if not compressed
        return data;
      }
    } catch (fallbackError) {
      console.log('No data in workflow/data');
    }
    
    // 2. Check workflow_chunks collection for chunked data
    try {
      const mainDoc = await getDoc(doc(firestore, 'workflow_chunks/main'));
      if (mainDoc.exists()) {
        const mainData = mainDoc.data();
        console.log('Found data in workflow_chunks');
        
        if (!mainData.isChunked && mainData.data) {
          // Single document
          return decompressData(mainData.data);
        }
        
        // It's chunked, need to load all chunks
        if (mainData.isChunked && mainData.chunkCount) {
          console.log(`Loading ${mainData.chunkCount} chunks...`);
          const chunks = [];
          
          for (let i = 0; i < mainData.chunkCount; i++) {
            const chunkDoc = await getDoc(doc(firestore, `workflow_chunks/chunk_${i}`));
            if (chunkDoc.exists()) {
              chunks.push(chunkDoc.data().data);
            }
          }
          
          if (chunks.length > 0) {
            const reassembled = chunks.join('');
            return decompressData(reassembled);
          }
        }
      }
    } catch (chunkError) {
      console.log('No data in workflow_chunks');
    }
    
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
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
      
      const result = await saveWorkflowToStorage(data);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Save attempt ${i + 1} failed:`, error);
    }
  }
  
  throw lastError;
};

// Local storage backup (optional)
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