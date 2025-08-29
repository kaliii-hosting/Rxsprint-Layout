import { storage } from '../config/firebase';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

const STORAGE_BASE_PATH = 'workflow-content';

export class WorkflowStorageFixed {
  constructor(userId = 'tdGILcyLbSOAUIjsoA93QGaj7Zm2') {
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
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      console.log('=== SAVING WORKFLOW DATA (FIXED) ===');
      console.log('Data size:', (blob.size / 1024).toFixed(2), 'KB');
      
      const storageRef = ref(storage, `${STORAGE_BASE_PATH}/${this.userId}/workflow-data.json`);
      
      // Create a data URL from the blob
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Upload using data URL
      console.log('Uploading to Firebase Storage...');
      await uploadString(storageRef, dataUrl, 'data_url');
      
      console.log('✓ Workflow data synced successfully to Firebase Storage');
      console.log('=== SAVE COMPLETE ===\n');
      
      return { success: true, size: blob.size };
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
      console.log('=== LOADING WORKFLOW DATA (FIXED) ===');
      const storageRef = ref(storage, `${STORAGE_BASE_PATH}/${this.userId}/workflow-data.json`);
      
      // Get download URL
      const url = await getDownloadURL(storageRef);
      console.log('Got download URL, fetching data...');
      
      // Fetch the data using the download URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const workflowData = await response.json();
      
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
      
      // Return null instead of throwing for CORS errors to allow fallback
      if (error.message && error.message.includes('CORS')) {
        console.log('CORS error detected, returning null to trigger fallback');
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
}

export const workflowStorageFixed = new WorkflowStorageFixed();