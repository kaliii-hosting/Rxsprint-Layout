import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDm1cNS_46XGFYg_Wt6vp3h059zzB1nTfA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cvse-32388.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://cvse-32388-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cvse-32388",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cvse-32388.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "899974287244",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:899974287244:web:24d847c7bc039a6c5490a9"
};

// Initialize Firebase - check if already initialized
let app;
let storage;
let firestore;
let database;

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
  
  console.log('Firebase services initialization complete');
} catch (error) {
  console.error('Firebase app initialization error:', error);
  console.error('Error details:', error.message, error.stack);
  
  // Set all to null if app initialization fails
  app = null;
  storage = null;
  firestore = null;
  database = null;
}

// Log the final state
console.log('Firebase initialization status:', {
  app: !!app,
  storage: !!storage,
  firestore: !!firestore,
  database: !!database
});

export { storage, firestore, database };
export default app;