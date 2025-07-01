import path from 'path';
import { writeFile, toCamel, capitalize } from './helperF.js';

/**
 * Generates the main store index file with enterprise-grade authentication
 * @param {string} storeName - Name of the store
 * @param {string} baseDir - Base directory path
 * @param {string[]} collections - Array of collection names
 * @param {string[]} authCollections - Authentication collections
 * @param {boolean} addActivityLogging - Whether to add activity logging
 */
export const generateIndexFile = (storeName, baseDir, collections, authCollections, addActivityLogging) => {
  try {
    const storeNameCamel = toCamel(storeName);
    const pascalStoreName = capitalize(storeNameCamel);
    const primaryAuthCollection = authCollections.length > 0 ? authCollections[0] : null;

    // Generate action imports
    const actionImports = collections.map(col => 
      `import use${capitalize(col)}Actions from './actions/${col}.js';`
    ).join('\n');

    // Generate auth imports with all necessary functions
    const authImports = authCollections.length > 0 ? `
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '@/firebase';` : '';

    // Generate action initialization
    const actionInits = collections.map(col => 
      `const ${col}Actions = use${capitalize(col)}Actions(state);`
    ).join('\n  ');

    // Generate action spreads
    const actionSpreads = collections.map(col => 
      `...${col}Actions`
    ).join(',\n    ');

    // Add auth actions if needed
    let authActions = '';
    if (authCollections.length > 0) {
      authActions = `
    /**
     * Authenticates a user with email and password
     * @async
     * @function
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<AuthResponse>} Authentication response
     * @throws {error} If authentication fails
     * 
     * @example
     * try {
     *   const user = await store.login('user@example.com', 'password123');
     *   console.log('Logged in:', user);
     * } catch (error) {
     *   console.error('Login failed:', error.message);
     * }
     */
    async login(email, password) {
      try {
        state.loading.value = true;
        state.error.value = null;
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          metadata: {
            creationTime: userCredential.user.metadata.creationTime,
            lastSignInTime: userCredential.user.metadata.lastSignInTime
          }
        };
        
        state.currentUser.value = user;
        
        // Fetch user profile from Firestore
        if (user.uid) {
          try {
            const userProfile = await ${primaryAuthCollection}Actions.get(user.uid);
            if (userProfile) {
              state.currentUser.value = { ...user, ...userProfile };
            }
          } catch (profileError) {
            console.warn('User profile fetch failed:', profileError.message);
          }
        }
        
        return { success: true, user: state.currentUser.value };
      } catch (error) {
        let errorMessage = 'Authentication failed';
        
        // Handle specific error codes
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many attempts. Account temporarily locked';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          default:
            errorMessage = error.message || 'Authentication error';
        }
        
        state.error.value = errorMessage;
        throw { code: error.code, message: errorMessage, error };
      } finally {
        state.loading.value = false;
      }
    },
    
    /**
     * Creates a new user account with comprehensive registration
     * @async
     * @function
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {Object} [profileData={}] - Additional user profile data
     * @param {boolean} [sendVerification=true] - Whether to send email verification
     * @returns {Promise<AuthResponse>} Registration response
     * @throws {error} If registration fails
     * 
     * @example
     * try {
     *   const result = await store.signUp(
     *     'newuser@example.com', 
     *     'SecurePassword123!',
     *     { displayName: 'John Doe', role: 'customer' },
     *     true
     *   );
     *   console.log('User created:', result.user);
     * } catch (error) {
     *   console.error('Registration failed:', error.message);
     * }
     */
    async signUp(email, password, profileData = {}, sendVerification = true) {
      try {
        state.loading.value = true;
        state.error.value = null;
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          emailVerified: userCredential.user.emailVerified,
          metadata: {
            creationTime: userCredential.user.metadata.creationTime
          },
          ...profileData
        };
        
        // Update profile if data provided
        if (profileData.displayName || profileData.photoURL) {
          await updateProfile(auth.currentUser, {
            displayName: profileData.displayName,
            photoURL: profileData.photoURL
          });
          user.displayName = profileData.displayName;
          user.photoURL = profileData.photoURL;
        }
        
        // Send verification email if requested
        if (sendVerification) {
          await sendEmailVerification(auth.currentUser);
          state.emailVerificationSent.value = true;
        }
        
        // Save user to Firestore
        await ${primaryAuthCollection}Actions.add(user);
        
        state.currentUser.value = user;
        return { success: true, user };
      } catch (error) {
        let errorMessage = 'Registration failed';
        
        // Handle specific error codes
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email already registered';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Account creation is disabled';
            break;
          default:
            errorMessage = error.message || 'Registration error';
        }
        
        state.error.value = errorMessage;
        throw { code: error.code, message: errorMessage, error };
      } finally {
        state.loading.value = false;
      }
    },
    
    /**
     * Signs out the current user and cleans up session
     * @async
     * @function
     * @returns {Promise<{success: boolean}>} Logout result
     * 
     * @example
     * await store.logout();
     * console.log('User signed out');
     */
    async logout() {
      try {
        state.loading.value = true;
        await signOut(auth);
        state.currentUser.value = null;
        state.emailVerificationSent.value = false;
        return { success: true };
      } catch (error) {
        state.error.value = error.message;
        throw { code: 'auth/logout-failed', message: 'Logout failed', error };
      } finally {
        state.loading.value = false;
      }
    },
    
    /**
     * Sends a password reset email to the specified address
     * @async
     * @function
     * @param {string} email - Email address to send reset instructions to
     * @returns {Promise<{success: boolean}>} Reset email status
     * 
     * @example
     * try {
     *   await store.sendPasswordReset('user@example.com');
     *   console.log('Password reset email sent');
     * } catch (error) {
     *   console.error('Reset failed:', error.message);
     * }
     */
    async sendPasswordReset(email) {
      try {
        state.loading.value = true;
        await sendPasswordResetEmail(auth, email);
        return { success: true };
      } catch (error) {
        state.error.value = error.message;
        throw { code: 'auth/reset-failed', message: 'Password reset failed', error };
      } finally {
        state.loading.value = false;
      }
    },
    
    /**
     * Updates the current user's profile information
     * @async
     * @function
     * @param {Object} profileData - Profile data to update
     * @param {string} [profileData.displayName] - New display name
     * @param {string} [profileData.photoURL] - New photo URL
     * @returns {Promise<{success: boolean, user: Object}>} Update result
     * 
     * @example
     * await store.updateProfile({ displayName: 'New Name', photoURL: 'https://...' });
     */
    async updateProfile(profileData) {
      try {
        state.loading.value = true;
        await updateProfile(auth.currentUser, profileData);
        
        // Update local state
        state.currentUser.value = {
          ...state.currentUser.value,
          ...profileData
        };
        
        // Update Firestore if we have a primary auth collection
        if (state.currentUser.value?.uid) {
          await ${primaryAuthCollection}Actions.update(
            state.currentUser.value.uid, 
            profileData
          );
        }
        
        return { 
          success: true, 
          user: state.currentUser.value 
        };
      } catch (error) {
        state.error.value = error.message;
        throw { code: 'auth/profile-update-failed', message: 'Profile update failed', error };
      } finally {
        state.loading.value = false;
      }
    },
    
    /**
     * Changes the current user's password with reauthentication
     * @async
     * @function
     * @param {string} currentPassword - Current password for reauthentication
     * @param {string} newPassword - New password to set
     * @returns {Promise<{success: boolean}>} Password change result
     * 
     * @example
     * try {
     *   await store.changePassword('oldPassword', 'newSecurePassword123!');
     *   console.log('Password changed successfully');
     * } catch (error) {
     *   console.error('Password change failed:', error.message);
     * }
     */
    async changePassword(currentPassword, newPassword) {
      try {
        state.loading.value = true;
        
        // Reauthenticate user
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email, 
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        // Update password
        await updatePassword(auth.currentUser, newPassword);
        
        return { success: true };
      } catch (error) {
        let errorMessage = 'Password change failed';
        
        switch (error.code) {
          case 'auth/wrong-password':
            errorMessage = 'Current password is incorrect';
            break;
          case 'auth/requires-recent-login':
            errorMessage = 'Session expired. Please log in again';
            break;
          case 'auth/weak-password':
            errorMessage = 'New password is too weak';
            break;
        }
        
        state.error.value = errorMessage;
        throw { code: error.code, message: errorMessage, error };
      } finally {
        state.loading.value = false;
      }
    },

        /**
     * Initializes authentication state and fetches current user
     * @async
     * @function
     * @returns {Promise<Object|null>} Current user object or null
     * 
     * @example
     * const user = await store.fetchUser();
     * console.log('Authenticated user:', user);
     */
    async fetchUser() {
      return new Promise((resolve) => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              // Fetch additional user data from Firestore
              try {
                const userProfile = await adminsActions.get(firebaseUser.uid);
                
                state.currentUser.value = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  emailVerified: firebaseUser.emailVerified,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  metadata: {
                    creationTime: firebaseUser.metadata.creationTime,
                    lastSignInTime: firebaseUser.metadata.lastSignInTime
                  },
                  ...userProfile // Merge Firestore data
                };
              } catch (profileError) {
                console.error('Profile fetch error:', profileError);
                // Fallback to basic auth info
                state.currentUser.value = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  emailVerified: firebaseUser.emailVerified,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  metadata: {
                    creationTime: firebaseUser.metadata.creationTime,
                    lastSignInTime: firebaseUser.metadata.lastSignInTime
                  }
                };
              }
            } else {
              state.currentUser.value = null;
            }
          } catch (error) {
            console.error('Auth state error:', error);
            state.currentUser.value = null;
            state.error.value = error.message;
          } finally {
            state.authInitialized.value = true;
            resolve(state.currentUser.value);
          }
        });
      });
      
      //return authInitPromise.value;
    },
    
    /**
     * Resends email verification to the current user
     * @async
     * @function
     * @returns {Promise<{success: boolean}>} Verification email status
     */
    async resendVerificationEmail() {
      try {
        if (!auth.currentUser) throw new Error('No authenticated user');
        
        state.loading.value = true;
        await sendEmailVerification(auth.currentUser);
        state.emailVerificationSent.value = true;
        return { success: true };
      } catch (error) {
        state.error.value = error.message;
        throw { code: 'auth/verification-failed', message: 'Verification email failed', error };
      } finally {
        state.loading.value = false;
      }
    },`;
    }

    writeFile(
      path.join(baseDir, 'index.js'),
      `import { defineStore } from 'pinia';
import use${pascalStoreName}State from './state.js';
${authImports}
${actionImports}

/**
 * ${pascalStoreName} Store
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Operation success status
 * @property {Object} [user] - Authenticated user object
 * 
 * @typedef {Object} error
 * @property {string} code - Error code
 * @property {string} message - Human-readable error message
 * @property {Error} error - Original error object
 */
export const use${pascalStoreName} = defineStore('${storeName}', () => {
  const state = use${pascalStoreName}State();

  // Initialize actions
  ${actionInits}
  
  return {
    ...state,
    ${authActions}
    ${actionSpreads}
  };
});`
    );
  } catch (error) {
    throw new Error(`Error generating index file: ${error.message}`);
  }
};