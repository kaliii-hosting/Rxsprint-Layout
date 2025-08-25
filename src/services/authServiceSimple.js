import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

class SimpleAuthService {
  constructor() {
    this.currentUser = null;
    this.authPromise = null;
  }

  // Initialize and ensure authentication
  async ensureAuth() {
    // If already authenticated, return immediately
    if (this.currentUser) {
      return this.currentUser;
    }

    // If authentication is in progress, wait for it
    if (this.authPromise) {
      return this.authPromise;
    }

    // Start new authentication
    this.authPromise = new Promise((resolve, reject) => {
      // Check current auth state
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // User already signed in
          console.log('User already authenticated:', user.uid);
          this.currentUser = user;
          unsubscribe();
          resolve(user);
        } else {
          // Sign in anonymously
          try {
            console.log('Signing in anonymously...');
            const result = await signInAnonymously(auth);
            console.log('Anonymous sign-in successful:', result.user.uid);
            this.currentUser = result.user;
            unsubscribe();
            resolve(result.user);
          } catch (error) {
            console.error('Anonymous sign-in failed:', error);
            unsubscribe();
            reject(error);
          }
        }
      });
    });

    return this.authPromise;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Create singleton
const simpleAuth = new SimpleAuthService();

// Auto-initialize on load
simpleAuth.ensureAuth().catch(error => {
  console.error('Initial auth failed:', error);
});

export default simpleAuth;