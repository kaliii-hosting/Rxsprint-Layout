import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { WorkflowFirestoreManager } from './workflowFirestoreStorage';

/**
 * CORS-free workflow storage manager that uses Firebase SDK properly
 * This avoids CORS issues by using the Firebase SDK instead of direct HTTP calls
 */
export class WorkflowStorageCORSFree {
  constructor(userId = 'tdGILcyLbSOAUIjsoA93QGaj7Zm2') {
    this.userId = userId;
    this.storage = getStorage();
    this.firestoreManager = new WorkflowFirestoreManager(userId);
    
    // Always prefer Firestore for now to avoid CORS issues
    this.preferFirestore = true;
    
    console.log('WorkflowStorageCORSFree initialized for user:', userId);
  }

  async syncWorkflowData(workflowData) {
    console.log('=== CORS-FREE STORAGE SAVE ===');
    
    // Always try Firestore first to avoid CORS issues
    try {
      const result = await this.firestoreManager.syncWorkflowData(workflowData);
      console.log('✅ Successfully saved to Firestore (CORS-free)');
      return result;
    } catch (firestoreError) {
      console.error('⚠️ Firestore failed:', firestoreError.message);
      
      // Only try Firebase Storage as fallback if specifically requested
      if (!this.preferFirestore) {
        try {
          await this._saveToFirebaseStorage(workflowData);
          console.log('✅ Successfully saved to Firebase Storage (fallback)');
          return { success: true, source: 'firebase-storage', data: workflowData };
        } catch (storageError) {
          console.error('❌ Both storage methods failed');
          throw new Error('Failed to save data to both Firestore and Firebase Storage');
        }
      } else {
        throw firestoreError;
      }
    }
  }

  async loadWorkflowData() {
    console.log('=== CORS-FREE STORAGE LOAD ===');
    
    // Try Firestore first
    try {
      const result = await this.firestoreManager.loadWorkflowData();
      if (result && Object.keys(result).length > 0) {
        console.log('✅ Successfully loaded from Firestore');
        return result;
      }
    } catch (error) {
      console.error('⚠️ Firestore load failed:', error.message);
    }

    // Try Firebase Storage as fallback (only if not preferring Firestore)
    if (!this.preferFirestore) {
      try {
        const result = await this._loadFromFirebaseStorage();
        console.log('✅ Successfully loaded from Firebase Storage (fallback)');
        return result;
      } catch (error) {
        console.error('❌ Firebase Storage load also failed:', error.message);
      }
    }

    // Return empty workflow if all methods fail
    console.log('📝 Returning empty workflow data');
    return {
      workflowItems: {},
      lastSaved: null,
      version: '1.0'
    };
  }

  async _saveToFirebaseStorage(workflowData) {
    const fileName = 'workflow-data.json';
    const filePath = `workflow-content/${this.userId}/${fileName}`;
    const storageRef = ref(this.storage, filePath);
    
    const jsonData = JSON.stringify(workflowData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    await uploadBytes(storageRef, blob);
    console.log('Data uploaded to Firebase Storage:', filePath);
  }

  async _loadFromFirebaseStorage() {
    const fileName = 'workflow-data.json';
    const filePath = `workflow-content/${this.userId}/${fileName}`;
    const storageRef = ref(this.storage, filePath);
    
    try {
      const url = await getDownloadURL(storageRef);
      
      // Use Firebase SDK to get the download URL, then fetch
      // This should avoid CORS issues
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading from Firebase Storage:', error);
      throw error;
    }
  }

  // Method to switch storage preference
  setPreferFirestore(prefer = true) {
    this.preferFirestore = prefer;
    console.log('Storage preference updated. Prefer Firestore:', prefer);
  }
}

export default WorkflowStorageCORSFree;