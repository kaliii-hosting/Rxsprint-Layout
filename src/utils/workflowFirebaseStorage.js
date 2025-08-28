import { storage } from '../config/firebase';
import { ref, getBytes, uploadBytes, uploadString, getDownloadURL, getMetadata } from 'firebase/storage';

const STORAGE_BASE_PATH = 'workflow-content';

export class WorkflowStorageManager {
  constructor(userId = 'default-user') {
    this.userId = userId;
  }

  async syncWorkflowData(workflowData) {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    try {
      // Validate data before saving
      if (!workflowData) {
        console.warn('No workflow data to save');
        return { success: false, error: 'No data to save' };
      }

      // Clean and prepare data for JSON serialization
      const cleanData = this.cleanDataForSerialization(workflowData);
      
      // Convert to JSON string
      const jsonContent = JSON.stringify(cleanData, null, 2);
      const contentSize = jsonContent.length;
      
      console.log('=== SAVING WORKFLOW DATA ===');
      console.log('Data size:', contentSize, 'bytes (', (contentSize / 1024).toFixed(2), 'KB)');
      
      // Validate JSON before uploading
      try {
        const testParse = JSON.parse(jsonContent);
        console.log('✓ JSON validation passed');
      } catch (validationError) {
        console.error('✗ JSON validation failed:', validationError);
        throw new Error('Invalid JSON data');
      }
      
      const storageRef = ref(storage, `${STORAGE_BASE_PATH}/${this.userId}/workflow-data.json`);
      
      // Convert to base64 for reliable upload
      const base64Content = btoa(unescape(encodeURIComponent(jsonContent)));
      
      // Upload using base64 encoding for consistency
      console.log('Uploading to Firebase Storage (base64 encoded)...');
      const snapshot = await uploadString(storageRef, base64Content, 'base64', {
        contentType: 'application/json;charset=utf-8',
        customMetadata: {
          lastUpdated: new Date().toISOString(),
          userId: this.userId,
          originalSize: String(contentSize),
          encoding: 'base64',
          contentHash: this.hashString(jsonContent)
        }
      });

      console.log('✓ Upload completed. File size:', snapshot.metadata.size, 'bytes');
      
      // Verify the upload was successful by downloading and checking content
      try {
        const verifyBytes = await getBytes(storageRef, 100 * 1024 * 1024);
        const decoder = new TextDecoder('utf-8');
        const verifyString = decoder.decode(verifyBytes);
        const verifyData = JSON.parse(verifyString);
        console.log('✓ Upload verification successful. Content is valid JSON');
      } catch (verifyError) {
        console.error('⚠ Upload verification warning:', verifyError.message);
        // Don't throw error as upload might still be successful
      }
      
      console.log('✓ Workflow data synced successfully to Firebase Storage');
      console.log('=== SAVE COMPLETE ===\n');
      
      return { success: true, size: contentSize };
    } catch (error) {
      console.error('✗ Error syncing to Firebase Storage:', error);
      throw error;
    }
  }

  async loadWorkflowData() {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    try {
      console.log('=== LOADING WORKFLOW DATA ===');
      const storageRef = ref(storage, `${STORAGE_BASE_PATH}/${this.userId}/workflow-data.json`);
      
      // Get metadata first to know the expected size
      let metadata;
      try {
        metadata = await getMetadata(storageRef);
        console.log('File metadata - Size:', metadata.size, 'bytes, Updated:', metadata.updated);
        console.log('Custom metadata:', metadata.customMetadata);
      } catch (metaError) {
        if (metaError.code === 'storage/object-not-found') {
          console.log('No workflow data found in Firebase Storage');
          return null;
        }
        throw metaError;
      }
      
      const expectedSize = metadata.size;
      const originalSize = metadata.customMetadata?.originalSize;
      const encoding = metadata.customMetadata?.encoding;
      
      console.log('Downloading from Firebase Storage...');
      console.log('File size:', expectedSize, 'bytes, Original size:', originalSize, 'Encoding:', encoding);
      
      // Download with appropriate size limit (100MB max)
      const maxSize = 100 * 1024 * 1024;
      const bytes = await getBytes(storageRef, maxSize);
      
      console.log('✓ Downloaded', bytes.byteLength, 'bytes');
      
      // Note: Firebase automatically decodes base64 when using getBytes
      // So we don't need to check exact size match since it may differ from stored size
      
      // Decode bytes to string
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let jsonString;
      try {
        jsonString = decoder.decode(bytes);
        console.log('✓ Decoded to string, length:', jsonString.length);
      } catch (decodeError) {
        console.error('✗ Failed to decode bytes:', decodeError);
        throw new Error('Failed to decode data');
      }
      
      // Validate and parse JSON
      const trimmedJson = jsonString.trim();
      
      // Check JSON structure
      if (!trimmedJson.startsWith('{') || !trimmedJson.endsWith('}')) {
        console.error('✗ Invalid JSON structure');
        console.error('First 100 chars:', trimmedJson.substring(0, 100));
        console.error('Last 100 chars:', trimmedJson.substring(trimmedJson.length - 100));
        throw new Error('Invalid JSON structure');
      }
      
      // Parse JSON
      let workflowData;
      try {
        workflowData = JSON.parse(trimmedJson);
        console.log('✓ JSON parsed successfully');
      } catch (parseError) {
        console.error('✗ JSON parse error:', parseError);
        console.error('String length:', trimmedJson.length);
        
        // Find where the JSON might be truncated
        let openBraces = 0;
        let closeBraces = 0;
        for (let i = 0; i < trimmedJson.length; i++) {
          if (trimmedJson[i] === '{') openBraces++;
          if (trimmedJson[i] === '}') closeBraces++;
        }
        console.error('Open braces:', openBraces, 'Close braces:', closeBraces);
        
        throw new Error('Failed to parse JSON data');
      }
      
      // Validate data structure
      if (!workflowData || typeof workflowData !== 'object') {
        console.error('✗ Invalid workflow data structure');
        throw new Error('Invalid workflow data structure');
      }
      
      console.log('✓ Workflow data loaded successfully');
      console.log('=== LOAD COMPLETE ===\n');
      
      return workflowData;
    } catch (error) {
      console.error('✗ Error loading from Firebase Storage:', error);
      
      if (error.code === 'storage/object-not-found') {
        console.log('No workflow data exists yet');
        return null;
      }
      
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

  // Simple hash function for verification
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

export const workflowStorageManager = new WorkflowStorageManager();