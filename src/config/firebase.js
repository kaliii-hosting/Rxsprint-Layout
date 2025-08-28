import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Use the fallback API key which appears to be the working one
const firebaseConfig = {
  apiKey: "AIzaSyDm1cNS_46XGFYg_Wt6vp3h059zzB1nTfA",
  authDomain: "cvse-32388.firebaseapp.com",
  databaseURL: "https://cvse-32388-default-rtdb.firebaseio.com",
  projectId: "cvse-32388",
  storageBucket: "cvse-32388.firebasestorage.app",
  messagingSenderId: "899974287244",
  appId: "1:899974287244:web:24d847c7bc039a6c5490a9"
};

// Initialize Firebase - check if already initialized
let app;
let storage;
let firestore;
let database;
let auth;

try {
  // Check if Firebase app already exists
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized');
  } else {
    app = getApp();
    console.log('Using existing Firebase app');
  }
  
  // Initialize Firebase services
  try {
    storage = getStorage(app);
    console.log('Firebase Storage initialized');
  } catch (error) {
    console.error('Storage initialization error:', error);
    storage = null;
  }
  
  try {
    firestore = getFirestore(app);
    console.log('Firestore initialized');
  } catch (error) {
    console.error('Firestore initialization error:', error);
    firestore = null;
  }
  
  try {
    database = getDatabase(app);
    console.log('Realtime Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    database = null;
  }
  
  try {
    auth = getAuth(app);
    console.log('Firebase Auth initialized');
  } catch (error) {
    console.error('Auth initialization error:', error);
    auth = null;
  }
  
  console.log('Firebase services initialization complete');
} catch (error) {
  console.error('Firebase app initialization error:', error);
  console.error('Error details:', error.message, error.stack);
  
  // Set all to null if app initialization fails
  app = null;
  storage = null;
  firestore = null;
  database = null;
  auth = null;
}

// Log the final state
console.log('Firebase initialization status:', {
  app: !!app,
  storage: !!storage,
  firestore: !!firestore,
  database: !!database,
  auth: !!auth
});

// Export db as an alias for firestore for compatibility
const db = firestore;

// Named exports
export { storage, firestore, database, auth, db };

// Default export
export default app;