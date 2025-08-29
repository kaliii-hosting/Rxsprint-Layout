import { WorkflowStorageFixed } from './workflowStorageFixed';
import { WorkflowFirestoreManager } from './workflowFirestoreStorage';

export class WorkflowHybridStorageManager {
  constructor(userId = 'tdGILcyLbSOAUIjsoA93QGaj7Zm2') {
    this.userId = userId;
    this.storageManager = new WorkflowStorageFixed(userId);
    this.firestoreManager = new WorkflowFirestoreManager(userId);
    // Use Firebase Storage in production, Firestore in development
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
    this.preferredMethod = isProduction ? 'storage' : 'firestore';
    console.log(`Running in ${isProduction ? 'production' : 'development'} mode, using ${this.preferredMethod} as primary storage`);
  }

  async syncWorkflowData(workflowData) {
    console.log('=== HYBRID STORAGE SAVE ===');
    console.log('Attempting save with preferred method:', this.preferredMethod);
    
    // Try preferred method first
    if (this.preferredMethod === 'storage') {
      try {
        const result = await this.storageManager.syncWorkflowData(workflowData);
        console.log('✅ Successfully saved to Firebase Storage');
        return result;
      } catch (storageError) {
        console.error('⚠️ Firebase Storage failed:', storageError.message);
        console.log('Falling back to Firestore...');
        
        try {
          const result = await this.firestoreManager.syncWorkflowData(workflowData);
          console.log('✅ Successfully saved to Firestore (fallback)');
          return result;
        } catch (firestoreError) {
          console.error('❌ Both storage methods failed');
          throw new Error('Failed to save data to both Firebase Storage and Firestore');
        }
      }
    } else {
      // Firestore is preferred (development mode)
      try {
        const result = await this.firestoreManager.syncWorkflowData(workflowData);
        console.log('✅ Successfully saved to Firestore');
        return result;
      } catch (firestoreError) {
        console.error('⚠️ Firestore failed:', firestoreError.message);
        console.log('Falling back to Firebase Storage...');
        
        try {
          const result = await this.storageManager.syncWorkflowData(workflowData);
          console.log('✅ Successfully saved to Firebase Storage (fallback)');
          return result;
        } catch (storageError) {
          console.error('❌ Both storage methods failed');
          throw new Error('Failed to save data to both Firebase Storage and Firestore');
        }
      }
    }
  }

  async loadWorkflowData() {
    console.log('=== HYBRID STORAGE LOAD ===');
    
    // Try preferred method first
    if (this.preferredMethod === 'storage') {
      try {
        console.log('Attempting to load from Firebase Storage...');
        const storageData = await this.storageManager.loadWorkflowData();
        if (storageData) {
          console.log('✅ Found data in Firebase Storage');
          return storageData;
        }
      } catch (error) {
        console.error('⚠️ Firebase Storage load failed:', error.message);
      }
      
      // Fallback to Firestore
      try {
        console.log('Attempting to load from Firestore (fallback)...');
        const firestoreData = await this.firestoreManager.loadWorkflowData();
        if (firestoreData) {
          console.log('✅ Found data in Firestore');
          return firestoreData;
        }
      } catch (error) {
        console.error('⚠️ Firestore load also failed:', error.message);
      }
    } else {
      // Firestore is preferred (development mode)
      try {
        console.log('Attempting to load from Firestore...');
        const firestoreData = await this.firestoreManager.loadWorkflowData();
        if (firestoreData) {
          console.log('✅ Found data in Firestore');
          return firestoreData;
        }
      } catch (error) {
        console.error('⚠️ Firestore load failed:', error.message);
      }
      
      // Fallback to Firebase Storage
      try {
        console.log('Attempting to load from Firebase Storage (fallback)...');
        const storageData = await this.storageManager.loadWorkflowData();
        if (storageData) {
          console.log('✅ Found data in Firebase Storage');
          return storageData;
        }
      } catch (error) {
        console.error('⚠️ Firebase Storage load also failed:', error.message);
      }
    }
    
    console.log('No data found in either storage location');
    return null;
  }
}