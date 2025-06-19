import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDm1cNS_46XGFYg_Wt6vp3h059zzB1nTfA",
  authDomain: "cvse-32388.firebaseapp.com",
  databaseURL: "https://cvse-32388-default-rtdb.firebaseio.com",
  projectId: "cvse-32388",
  storageBucket: "cvse-32388.firebasestorage.app",
  messagingSenderId: "899974287244",
  appId: "1:899974287244:web:24d847c7bc039a6c5490a9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const storage = getStorage(app);
export const firestore = getFirestore(app);
export const database = getDatabase(app);

export default app;