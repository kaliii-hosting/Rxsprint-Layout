import { signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../config/firebase';

// Admin credentials - single user setup
const ADMIN_EMAIL = 'kaliiihosting@gmail.com';
const ADMIN_PASSWORD = 'RxSprint2024Admin!'; // You should update this with your actual password
const EXPECTED_UID = 'tdGILcyLbSOAUIjsoA93QGaj7Zm2';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.authStateListeners = [];
  }

  // Initialize authentication with automatic admin login
  async initialize() {
    if (this.isInitialized) {
      return this.currentUser;
    }

    // Check if auth is properly initialized
    if (!auth) {
      console.error('Firebase auth is not initialized. Check Firebase configuration.');
      throw new Error('Firebase auth not initialized');
    }

    try {
      // Set persistence to keep user logged in
      await setPersistence(auth, browserLocalPersistence);
      console.log('Auth persistence set to LOCAL');
    } catch (error) {
      console.warn('Could not set auth persistence:', error);
    }

    return new Promise((resolve, reject) => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user && user.uid === EXPECTED_UID) {
            // Correct admin user is already signed in
            console.log('Admin user already authenticated:', user.uid);
            this.currentUser = user;
            this.isInitialized = true;
            this.notifyListeners(user);
            unsubscribe();
            resolve(user);
          } else {
            // Always attempt auto-login for admin
            console.log('Attempting automatic admin login...');
            try {
              const signedInUser = await this.autoSignIn();
              this.currentUser = signedInUser;
              this.isInitialized = true;
              this.notifyListeners(signedInUser);
              unsubscribe();
              resolve(signedInUser);
            } catch (error) {
              console.error('Auto sign-in failed:', error);
              console.error('Error details:', error.code, error.message);
              // Still resolve with null user to prevent app from breaking
              this.isInitialized = true;
              unsubscribe();
              resolve(null);
            }
          }
        }, (error) => {
          console.error('Auth state change error:', error);
          console.error('Error details:', error.code, error.message);
          unsubscribe();
          reject(error);
        });
      } catch (error) {
        console.error('Failed to set up auth state listener:', error);
        reject(error);
      }
    });
  }

  // Auto sign-in function - simplified for single admin user
  async autoSignIn() {
    try {
      // Always sign in with admin credentials
      console.log('Signing in admin user automatically...');
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      
      // Verify it's the expected admin user
      if (userCredential.user.uid === EXPECTED_UID) {
        console.log('Admin authenticated successfully:', userCredential.user.uid);
      } else {
        console.warn(`User UID mismatch. Got: ${userCredential.user.uid}, Expected: ${EXPECTED_UID}`);
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Admin sign-in failed:', error.code, error.message);
      
      // Important: Update the ADMIN_PASSWORD constant with your actual password
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        console.error('Password is incorrect. Please update ADMIN_PASSWORD in authService.js with your actual Firebase password.');
      }
      
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Add auth state listener
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    // If already authenticated, call the callback immediately
    if (this.currentUser) {
      callback(this.currentUser);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  notifyListeners(user) {
    this.authStateListeners.forEach(callback => callback(user));
  }

  // Ensure authenticated before operation
  async ensureAuthenticated() {
    if (this.isAuthenticated()) {
      return this.currentUser;
    }
    
    // Wait for initialization if not done
    if (!this.isInitialized) {
      return await this.initialize();
    }
    
    // Try to sign in again if needed
    return await this.autoSignIn();
  }
}

// Create singleton instance
const authService = new AuthService();

// Auto-initialize on import
authService.initialize().then(
  user => console.log('Auth service initialized successfully:', user.uid),
  error => console.error('Auth service initialization failed:', error)
);

export default authService;