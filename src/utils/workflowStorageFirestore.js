import { doc, setDoc, getDoc, collection, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const WORKFLOW_COLLECTION = 'workflow_data_chunks';
const CHUNK_SIZE = 800000; // 800KB per chunk (safe under 1MB limit)

// Simple compression using base64 with validation
export const compressData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // Add data integrity check
    const checksum = jsonString.length;
    const compressed = btoa(unescape(encodeURIComponent(jsonString)));
    return {
      data: compressed,
      checksum: checksum,
      version: 2 // Version for migration handling
    };
  } catch (error) {
    console.error('Compression failed:', error);
    // Fallback to uncompressed with version
    return {
      data: JSON.stringify(data),
      checksum: JSON.stringify(data).length,
      compressed: false,
      version: 2
    };
  }
};

export const decompressData = (compressed) => {
  try {
    // Handle legacy format (plain string)
    if (typeof compressed === 'string') {
      try {
        // Try base64 decoding first
        const decoded = atob(compressed);
        const jsonString = decodeURIComponent(escape(decoded));
        return JSON.parse(jsonString);
      } catch (base64Error) {
        // If base64 fails, try direct JSON parse
        try {
          return JSON.parse(compressed);
        } catch (jsonError) {
          console.error('Legacy decompression failed:', base64Error, jsonError);
          return null;
        }
      }
    }
    
    // Handle new format with integrity check
    if (compressed && typeof compressed === 'object') {
      const { data, checksum, compressed: isCompressed, version } = compressed;
      
      if (!data) {
        console.error('No data found in compressed object');
        return null;
      }
      
      try {
        let jsonString;
        
        if (isCompressed === false) {
          // Data was stored uncompressed
          jsonString = data;
        } else {
          // Try to decompress
          const decoded = atob(data);
          jsonString = decodeURIComponent(escape(decoded));
        }
        
        // Validate checksum if available
        if (checksum && jsonString.length !== checksum) {
          console.warn('Checksum mismatch - data may be corrupted');
        }
        
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('Decompression with integrity check failed:', error);
        // Try direct parse as fallback
        try {
          return JSON.parse(data);
        } catch (fallbackError) {
          console.error('All decompression methods failed');
          return null;
        }
      }
    }
    
    console.error('Unknown compressed data format');
    return null;
  } catch (error) {
    console.error('Critical decompression error:', error);
    return null;
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
    const compressedObj = compressData(data);
    const serialized = JSON.stringify(compressedObj);
    const dataSize = new Blob([serialized]).size;
    
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
        ...compressedObj,
        chunked: false,
        size: dataSize,
        timestamp: new Date().toISOString()
      });
      
      console.log('Saved as single document to Firestore');
    } else {
      // Need to chunk the serialized data
      const chunks = chunkString(serialized, CHUNK_SIZE);
      const batch = writeBatch(firestore);
      
      // Save metadata
      batch.set(doc(firestore, WORKFLOW_COLLECTION, 'metadata'), {
        chunked: true,
        chunkCount: chunks.length,
        totalSize: dataSize,
        checksum: compressedObj.checksum,
        version: compressedObj.version,
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

// Load from Firestore with chunk reassembly and validation
export const loadWorkflowFromFirestore = async () => {
  try {
    // Check for single document first
    const mainDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, 'main'));
    if (mainDoc.exists()) {
      const mainData = mainDoc.data();
      if (!mainData.chunked) {
        console.log('Loaded single document from Firestore');
        
        // Handle new format with version
        if (mainData.version === 2) {
          return decompressData(mainData);
        }
        
        // Handle legacy format
        if (mainData.data) {
          return decompressData(mainData.data);
        }
        
        // Direct data without wrapper
        return decompressData(mainData);
      }
    }
    
    // Check for chunked data
    const metadataDoc = await getDoc(doc(firestore, WORKFLOW_COLLECTION, 'metadata'));
    if (metadataDoc.exists()) {
      const metadata = metadataDoc.data();
      if (metadata.chunked && metadata.chunkCount) {
        console.log(`Loading ${metadata.chunkCount} chunks from Firestore...`);
        
        const chunks = new Array(metadata.chunkCount);
        const chunkPromises = [];
        
        for (let i = 0; i < metadata.chunkCount; i++) {
          chunkPromises.push(
            getDoc(doc(firestore, WORKFLOW_COLLECTION, `chunk_${i}`))
              .then(chunkDoc => {
                if (chunkDoc.exists()) {
                  const chunkData = chunkDoc.data();
                  chunks[chunkData.index] = chunkData.data;
                } else {
                  console.error(`Missing chunk ${i}`);
                  chunks[i] = ''; // Prevent undefined in join
                }
              })
              .catch(error => {
                console.error(`Error loading chunk ${i}:`, error);
                chunks[i] = ''; // Prevent undefined in join
              })
          );
        }
        
        await Promise.all(chunkPromises);
        
        // Validate all chunks are present
        let missingChunks = false;
        for (let i = 0; i < metadata.chunkCount; i++) {
          if (!chunks[i]) {
            console.error(`Chunk ${i} is missing or empty`);
            missingChunks = true;
          }
        }
        
        if (missingChunks) {
          console.error('Some chunks are missing, data may be corrupted');
          // Try to proceed anyway with what we have
        }
        
        const reassembled = chunks.join('');
        console.log('Chunks reassembled, attempting to parse...');
        
        // Try to parse the reassembled data
        try {
          const parsed = JSON.parse(reassembled);
          
          // Check if it's the new format with version
          if (parsed.version === 2) {
            return decompressData(parsed);
          }
          
          // Otherwise treat as direct data
          return parsed;
        } catch (parseError) {
          console.error('Failed to parse reassembled chunks:', parseError);
          // Try legacy decompression
          return decompressData(reassembled);
        }
      }
    }
    
    // Try legacy locations as fallback
    console.log('Checking legacy data locations...');
    
    // Check workflow/data
    try {
      const legacyDoc = await getDoc(doc(firestore, 'workflow/data'));
      if (legacyDoc.exists()) {
        const data = legacyDoc.data();
        console.log('Found legacy data in workflow/data');
        
        if (data.type === 'compressed' && data.data) {
          return decompressData(data.data);
        }
        return data;
      }
    } catch (legacyError) {
      console.log('Legacy workflow/data not accessible');
    }
    
    // Check workflow_chunks
    try {
      const legacyChunks = await getDoc(doc(firestore, 'workflow_chunks/main'));
      if (legacyChunks.exists()) {
        const data = legacyChunks.data();
        console.log('Found legacy data in workflow_chunks');
        
        if (data.data) {
          return decompressData(data.data);
        }
        return data;
      }
    } catch (legacyError) {
      console.log('Legacy workflow_chunks not accessible');
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

// Local storage backup with validation
export const saveToLocalBackup = (data) => {
  try {
    const compressedObj = compressData(data);
    const serialized = JSON.stringify(compressedObj);
    
    // Check if data fits in localStorage (typically 5-10MB limit)
    const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
    if (sizeInMB > 5) {
      console.warn(`Local backup size (${sizeInMB.toFixed(2)}MB) may exceed localStorage limits`);
    }
    
    localStorage.setItem('workflow_backup', serialized);
    localStorage.setItem('workflow_backup_time', new Date().toISOString());
    localStorage.setItem('workflow_backup_version', '2');
    console.log(`Local backup saved (${sizeInMB.toFixed(2)}MB)`);
    return true;
  } catch (error) {
    console.error('Local backup failed:', error);
    
    // Try to save uncompressed as fallback
    try {
      const uncompressed = JSON.stringify(data);
      localStorage.setItem('workflow_backup', uncompressed);
      localStorage.setItem('workflow_backup_time', new Date().toISOString());
      localStorage.setItem('workflow_backup_version', '1');
      console.log('Saved uncompressed backup as fallback');
      return true;
    } catch (fallbackError) {
      console.error('Even uncompressed backup failed:', fallbackError);
      return false;
    }
  }
};

export const loadFromLocalBackup = () => {
  try {
    const backup = localStorage.getItem('workflow_backup');
    if (!backup) {
      return null;
    }
    
    const backupTime = localStorage.getItem('workflow_backup_time');
    const backupVersion = localStorage.getItem('workflow_backup_version');
    console.log(`Local backup found from: ${backupTime}, version: ${backupVersion || 'legacy'}`);
    
    // Try to parse as JSON first (new format or uncompressed)
    try {
      const parsed = JSON.parse(backup);
      
      // Check if it's the new compressed format
      if (parsed.version === 2 || backupVersion === '2') {
        return decompressData(parsed);
      }
      
      // Check if it's uncompressed JSON
      if (backupVersion === '1' || (parsed && typeof parsed === 'object' && !parsed.data)) {
        return parsed;
      }
      
      // Otherwise try to decompress
      return decompressData(parsed);
    } catch (parseError) {
      // Legacy format - try direct decompression
      console.log('Attempting legacy decompression of local backup');
      return decompressData(backup);
    }
  } catch (error) {
    console.error('Local backup load failed:', error);
    return null;
  }
};

// Clear corrupted data function
export const clearCorruptedData = async () => {
  try {
    console.log('Clearing potentially corrupted data...');
    
    // Clear Firestore
    try {
      const allDocs = await getDocs(collection(firestore, WORKFLOW_COLLECTION));
      const deletePromises = [];
      allDocs.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      console.log('Firestore data cleared');
    } catch (firestoreError) {
      console.error('Failed to clear Firestore:', firestoreError);
    }
    
    // Clear localStorage
    localStorage.removeItem('workflow_backup');
    localStorage.removeItem('workflow_backup_time');
    localStorage.removeItem('workflow_backup_version');
    console.log('Local backup cleared');
    
    return true;
  } catch (error) {
    console.error('Failed to clear corrupted data:', error);
    return false;
  }
};