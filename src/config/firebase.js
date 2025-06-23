import { initializeApp } from 'firebase/app';
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

// Initialize Firebase
let app;
let storage;
let firestore;
let database;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase services with error handling
  storage = getStorage(app);
  firestore = getFirestore(app);
  database = getDatabase(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Create mock services for offline mode
  storage = null;
  firestore = null;
  database = null;
}

export { storage, firestore, database };
export default app;