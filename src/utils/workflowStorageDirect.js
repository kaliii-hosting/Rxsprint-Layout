import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
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
    
    console.log(`Saving to Firebase Storage: ${(dataSize / 1024).toFixed(1)}KB`);
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, STORAGE_PATH);
    await uploadString(storageRef, compressed, 'raw');
    const downloadUrl = await getDownloadURL(storageRef);
    
    // Save metadata to Firestore (optional, for tracking)
    try {
      await setDoc(doc(firestore, FIRESTORE_DOC), {
        storageUrl: downloadUrl,
        size: dataSize,
        timestamp: new Date().toISOString(),
        type: 'storage'
      });
    } catch (firestoreError) {
      console.log('Metadata save skipped:', firestoreError);
    }
    
    console.log('Successfully saved to Firebase Storage');
    return { 
      success: true, 
      size: dataSize,
      url: downloadUrl
    };
    
  } catch (error) {
    console.error('Firebase Storage save failed:', error);
    throw error;
  }
};

// Load directly from Firebase Storage
export const loadWorkflowFromStorage = async () => {
  try {
    // Try to get the download URL from Firestore metadata first
    let downloadUrl = null;
    
    try {
      const metadataDoc = await getDoc(doc(firestore, FIRESTORE_DOC));
      if (metadataDoc.exists() && metadataDoc.data().storageUrl) {
        downloadUrl = metadataDoc.data().storageUrl;
        console.log('Found storage URL in metadata');
      }
    } catch (firestoreError) {
      console.log('Metadata not available:', firestoreError);
    }
    
    // If no metadata, get URL directly from Storage
    if (!downloadUrl) {
      const storageRef = ref(storage, STORAGE_PATH);
      downloadUrl = await getDownloadURL(storageRef);
      console.log('Got storage URL directly');
    }
    
    // Fetch the data
    const response = await fetch(downloadUrl);
    const compressed = await response.text();
    const data = decompressData(compressed);
    
    console.log('Successfully loaded from Firebase Storage');
    return data;
    
  } catch (error) {
    console.error('Firebase Storage load failed:', error);
    
    // If storage fails, check if there's any data in the old Firestore location
    try {
      const fallbackDoc = await getDoc(doc(firestore, 'workflow/data'));
      if (fallbackDoc.exists()) {
        console.log('Found fallback data in Firestore');
        return fallbackDoc.data();
      }
    } catch (fallbackError) {
      console.log('No fallback data available');
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