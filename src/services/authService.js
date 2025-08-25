import { signInWithEmailAndPassword, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

// Admin credentials - in production, these should be in environment variables
const ADMIN_EMAIL = 'admin@rxsprint.com';
const ADMIN_PASSWORD = 'RxSprint2024Admin!';
const EXPECTED_UID = 'tdGILcyLbSOAUIjsoA93QGaj7Zm2';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.authStateListeners = [];
  }

  // Initialize authentication
  async initialize() {
    if (this.isInitialized) {
      return this.currentUser;
    }

    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User is already signed in
          console.log('User already authenticated:', user.uid);
          this.currentUser = user;
          this.isInitialized = true;
          this.notifyListeners(user);
          unsubscribe();
          resolve(user);
        } else {
          // No user signed in, attempt auto-login
          console.log('No user signed in, attempting auto-login...');
          try {
            const signedInUser = await this.autoSignIn();
            this.currentUser = signedInUser;
            this.isInitialized = true;
            this.notifyListeners(signedInUser);
            unsubscribe();
            resolve(signedInUser);
          } catch (error) {
            console.error('Auto sign-in failed:', error);
            unsubscribe();
            reject(error);
          }
        }
      });
    });
  }

  // Auto sign-in function
  async autoSignIn() {
    try {
      // First try to sign in with email/password
      console.log('Attempting to sign in with admin credentials...');
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('Successfully signed in as admin:', userCredential.user.uid);
      
      // Verify it's the expected admin user
      if (userCredential.user.uid !== EXPECTED_UID) {
        console.warn(`Warning: Signed in user UID (${userCredential.user.uid}) doesn't match expected UID (${EXPECTED_UID})`);
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Email/password sign-in failed:', error);
      
      // If email/password fails, try creating the account first
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credentials') {
        try {
          console.log('Attempting to create admin account...');
          const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          console.log('Admin account created successfully:', userCredential.user.uid);
          return userCredential.user;
        } catch (createError) {
          console.error('Failed to create admin account:', createError);
          
          // Fall back to anonymous authentication
          console.log('Falling back to anonymous authentication...');
          const anonCredential = await signInAnonymously(auth);
          console.log('Signed in anonymously:', anonCredential.user.uid);
          return anonCredential.user;
        }
      }
      
      // For other errors, fall back to anonymous
      console.log('Falling back to anonymous authentication...');
      const anonCredential = await signInAnonymously(auth);
      console.log('Signed in anonymously:', anonCredential.user.uid);
      return anonCredential.user;
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