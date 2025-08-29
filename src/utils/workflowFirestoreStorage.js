import { firestore } from '../config/firebase';
import { doc, setDoc, getDoc, collection, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';

const WORKFLOW_COLLECTION = 'workflow_data';
const CHUNK_SIZE = 800000; // 800KB per chunk (safe under 1MB Firestore limit)

export class WorkflowFirestoreManager {
  constructor(userId = 'default-user') {
    this.userId = userId;
  }

  // Split large strings into chunks
  chunkString(str, size) {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.substring(i, i + size));
    }
    return chunks;
  }

  async syncWorkflowData(workflowData) {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }

    try {
      console.log('=== SAVING TO FIRESTORE ===');
      
      // Validate data
      if (!workflowData) {
        console.warn('No workflow data to save');
        return { success: false, error: 'No data to save' };
      }

      // Clean data for serialization
      const cleanData = this.cleanDataForSerialization(workflowData);
      
      // Convert to JSON string
      const jsonContent = JSON.stringify(cleanData);
      const contentSize = jsonContent.length;
      
      console.log('Data size:', contentSize, 'bytes (', (contentSize / 1024).toFixed(2), 'KB)');
      
      // Create user-specific document path
      const userDocPath = `users/${this.userId}/workflow`;
      
      if (contentSize < CHUNK_SIZE) {
        // Small enough for single document
        console.log('Saving as single document...');
        
        await setDoc(doc(firestore, userDocPath, 'data'), {
          content: jsonContent,
          chunked: false,
          timestamp: new Date().toISOString(),
          size: contentSize,
          userId: this.userId
        });
        
        console.log('✓ Saved to Firestore successfully');
      } else {
        // Need to chunk the data
        const chunks = this.chunkString(jsonContent, CHUNK_SIZE);
        console.log(`Data will be chunked into ${chunks.length} parts`);
        
        const batch = writeBatch(firestore);
        
        // Save metadata
        batch.set(doc(firestore, userDocPath, 'data'), {
          chunked: true,
          chunkCount: chunks.length,
          timestamp: new Date().toISOString(),
          totalSize: contentSize,
          userId: this.userId
        });
        
        // Save chunks
        for (let i = 0; i < chunks.length; i++) {
          batch.set(doc(firestore, userDocPath, `chunk_${i}`), {
            data: chunks[i],
            index: i,
            total: chunks.length
          });
        }
        
        await batch.commit();
        console.log(`✓ Saved ${chunks.length} chunks to Firestore successfully`);
      }
      
      console.log('=== SAVE COMPLETE ===\n');
      return { success: true, size: contentSize };
      
    } catch (error) {
      console.error('✗ Error saving to Firestore:', error);
      
      // Try to save a minimal structure on error
      try {
        const minimalData = {
          lyso: { sections: [] },
          hae: { sections: [] },
          scd: { sections: [] },
          error: 'Failed to save full data',
          timestamp: new Date().toISOString()
        };
        
        const userDocPath = `users/${this.userId}/workflow`;
        await setDoc(doc(firestore, userDocPath, 'data'), minimalData);
        
        console.log('⚠ Saved minimal structure as fallback');
      } catch (fallbackError) {
        console.error('✗ Fallback save also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  async loadWorkflowData() {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }

    try {
      console.log('=== LOADING FROM FIRESTORE ===');
      
      const userDocPath = `users/${this.userId}/workflow`;
      const mainDoc = await getDoc(doc(firestore, userDocPath, 'data'));
      
      if (!mainDoc.exists()) {
        console.log('No workflow data found in Firestore');
        return null;
      }
      
      const mainData = mainDoc.data();
      console.log('Found document. Chunked:', mainData.chunked);
      
      if (!mainData.chunked) {
        // Single document
        if (mainData.content) {
          const workflowData = JSON.parse(mainData.content);
          console.log('✓ Loaded single document from Firestore');
          return workflowData;
        }
        // Old format or error state
        return mainData;
      }
      
      // Load and reassemble chunks
      console.log(`Loading ${mainData.chunkCount} chunks...`);
      const chunks = [];
      
      for (let i = 0; i < mainData.chunkCount; i++) {
        const chunkDoc = await getDoc(doc(firestore, userDocPath, `chunk_${i}`));
        if (chunkDoc.exists()) {
          chunks[i] = chunkDoc.data().data;
        } else {
          console.error(`Missing chunk ${i}`);
        }
      }
      
      const reassembled = chunks.join('');
      const workflowData = JSON.parse(reassembled);
      
      console.log('✓ Loaded and reassembled chunks from Firestore');
      console.log('=== LOAD COMPLETE ===\n');
      
      return workflowData;
      
    } catch (error) {
      console.error('✗ Error loading from Firestore:', error);
      throw error;
    }
  }

  // Helper method to clean data for JSON serialization
  cleanDataForSerialization(data) {
    try {
      // Use a replacer function to handle special cases
      const jsonString = JSON.stringify(data, (key, value) => {
        // Skip undefined, functions, and symbols
        if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
          return null;
        }
        
        // Handle large base64 images - log but keep them
        if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 100000) {
          console.log(`Large image in field '${key}', size: ${(value.length / 1024).toFixed(2)} KB`);
        }
        
        return value;
      });
      
      // Parse back to get clean object
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error cleaning data:', error);
      return data;
    }
  }
}