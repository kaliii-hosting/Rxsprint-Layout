import { storage, auth, firestore } from '../config/firebase';
import { ref, uploadString, getDownloadURL, listAll } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function debugFirebaseConnection() {
  console.log('=== DEBUGGING FIREBASE CONNECTION ===');
  
  const results = {
    storage: false,
    firestore: false,
    auth: false,
    errors: []
  };
  
  // Check Auth
  console.log('\n1. Checking Firebase Auth...');
  try {
    if (auth) {
      console.log('✅ Auth initialized');
      console.log('Current user:', auth.currentUser);
      if (auth.currentUser) {
        console.log('User ID:', auth.currentUser.uid);
        console.log('Email:', auth.currentUser.email);
      }
      results.auth = true;
    } else {
      console.log('❌ Auth not initialized');
    }
  } catch (error) {
    console.error('Auth error:', error);
    results.errors.push({ service: 'auth', error: error.message });
  }
  
  // Check Storage
  console.log('\n2. Checking Firebase Storage...');
  try {
    if (storage) {
      console.log('✅ Storage initialized');
      console.log('Bucket:', storage.app.options.storageBucket);
      
      // Try to list files in notes
      const listRef = ref(storage, 'notes/');
      try {
        const listResult = await listAll(listRef);
        console.log('Files in notes:', listResult.items.length);
        listResult.items.forEach(item => {
          console.log('  -', item.fullPath);
        });
        results.storage = true;
      } catch (listError) {
        if (listError.code === 'storage/unauthorized') {
          console.log('⚠️ Cannot list files - unauthorized. Trying direct upload test...');
          
          // Try a simple upload
          const testRef = ref(storage, 'notes/debug-test.txt');
          try {
            await uploadString(testRef, 'Debug test at ' + new Date().toISOString());
            console.log('✅ Direct upload successful!');
            results.storage = true;
          } catch (uploadError) {
            console.error('❌ Upload failed:', uploadError.message);
            results.errors.push({ service: 'storage', error: uploadError.message });
          }
        } else {
          console.error('❌ List files error:', listError.message);
          results.errors.push({ service: 'storage', error: listError.message });
        }
      }
    } else {
      console.log('❌ Storage not initialized');
    }
  } catch (error) {
    console.error('Storage error:', error);
    results.errors.push({ service: 'storage', error: error.message });
  }
  
  // Check Firestore
  console.log('\n3. Checking Firestore...');
  try {
    if (firestore) {
      console.log('✅ Firestore initialized');
      
      // Try to read/write a test document
      const testDoc = doc(firestore, 'debug', 'test');
      try {
        await setDoc(testDoc, {
          test: true,
          timestamp: new Date().toISOString()
        });
        console.log('✅ Firestore write successful');
        
        const readDoc = await getDoc(testDoc);
        if (readDoc.exists()) {
          console.log('✅ Firestore read successful:', readDoc.data());
          results.firestore = true;
        }
      } catch (firestoreError) {
        console.error('❌ Firestore operation failed:', firestoreError.message);
        results.errors.push({ service: 'firestore', error: firestoreError.message });
      }
    } else {
      console.log('❌ Firestore not initialized');
    }
  } catch (error) {
    console.error('Firestore error:', error);
    results.errors.push({ service: 'firestore', error: error.message });
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Auth:', results.auth ? '✅' : '❌');
  console.log('Storage:', results.storage ? '✅' : '❌');
  console.log('Firestore:', results.firestore ? '✅' : '❌');
  
  if (results.errors.length > 0) {
    console.log('\nErrors encountered:');
    results.errors.forEach(err => {
      console.log(`  ${err.service}: ${err.error}`);
    });
  }
  
  console.log('\n=== DEBUG COMPLETE ===');
  return results;
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.debugFirebase = debugFirebaseConnection;
  console.log('Debug function available: window.debugFirebase()');
}