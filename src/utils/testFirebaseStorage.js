import { storage } from '../config/firebase';
import { ref, uploadString, getDownloadURL, getBytes } from 'firebase/storage';

export async function testFirebaseStorage() {
  console.log('=== TESTING FIREBASE STORAGE ===');
  
  // Check if storage is initialized
  if (!storage) {
    console.error('❌ Firebase Storage is not initialized');
    return false;
  }
  
  console.log('✅ Firebase Storage is initialized');
  console.log('Storage bucket:', storage.app.options.storageBucket);
  
  try {
    // Test data
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test upload to Firebase Storage'
    };
    
    const jsonString = JSON.stringify(testData, null, 2);
    console.log('Test data:', jsonString);
    
    // Create a reference
    const testRef = ref(storage, 'notes/test/test-file.json');
    console.log('Storage reference created:', testRef.fullPath);
    
    // Try to upload
    console.log('Attempting upload...');
    const snapshot = await uploadString(testRef, jsonString, 'raw', {
      contentType: 'application/json'
    });
    
    console.log('✅ Upload successful!');
    console.log('Snapshot:', snapshot);
    
    // Try to get download URL
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Download URL:', downloadURL);
    
    // Try to download the file
    console.log('Attempting download...');
    const bytes = await getBytes(testRef);
    const decoder = new TextDecoder();
    const downloadedContent = decoder.decode(bytes);
    const downloadedData = JSON.parse(downloadedContent);
    
    console.log('✅ Download successful!');
    console.log('Downloaded data:', downloadedData);
    
    // Verify the data matches
    if (downloadedData.message === testData.message) {
      console.log('✅ Data integrity verified!');
    } else {
      console.log('❌ Data mismatch!');
    }
    
    console.log('=== TEST COMPLETE ===');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'storage/unauthorized') {
      console.error('⚠️ Storage rules may need to be updated to allow access');
      console.error('⚠️ Make sure notes path is allowed in storage.rules');
    }
    
    if (error.code === 'storage/unknown') {
      console.error('⚠️ Firebase Storage might not be properly configured');
      console.error('⚠️ Check Firebase console to ensure Storage is activated');
    }
    
    return false;
  }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  window.testFirebaseStorage = testFirebaseStorage;
  console.log('Test function available as window.testFirebaseStorage()');
}