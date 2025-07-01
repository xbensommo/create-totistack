import path from 'path';
import { writeFile } from './helperF.js';

/**
 * Generates the Firestore utility file
 * @param {string} baseDir - Base directory path
 * @param {string[]} authC - Authentication collections
 * @param {string[]} roles - User roles for authorization
 * @param {boolean} addActivityLogging - Whether to add activity logging
 */
export const generateFirestoreUtilFile = (baseDir, authC, roles, addActivityLogging) => {
  try {
    const authCollections = authC;

    // Add role-based authorization if needed
    const roleCheck = roles.length > 0 ? `
    /**
     * Checks if user has required role
     * @param {string} requiredRole - Required role
     * @throws {Error} If user doesn't have required role
     */
    _checkRole(requiredRole) {
      if (!state.currentUser.value || !state.currentUser.value.roles) {
        throw new Error('User not authenticated');
      }
      
      if (!state.currentUser.value.roles.includes(requiredRole)) {
        throw new Error(\`User lacks required role: \${requiredRole}\`);
      }
    },` : '';

    // Add role-based actions ONLY for auth collections
    const authRoleActions = roles.length > 0 ? `
    , ...(authCollections.includes(collectionName) ? {
      /**
       * Assigns roles to a user
       * @async
       * @function
       * @param {string} userId - User ID
       * @param {string[]} roles - Roles to assign
       * @returns {Promise<void>}
       */
      async assignRoles(userId, roles) {
        try {
          this._checkRole('admin');
          await updateDoc(doc(db, collectionName, userId), {
            roles: Array.isArray(roles) ? roles : [roles]
          });
        } catch (error) {
          state.error.value = error.message;
          throw error;
        }
      },
      
      /**
       * Revokes roles from a user
       * @async
       * @function
       * @param {string} userId - User ID
       * @param {string[]} roles - Roles to revoke
       * @returns {Promise<void>}
       */
      async revokeRoles(userId, roles) {
        try {
          this._checkRole('admin');
          const userRef = doc(db, collectionName, userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const currentRoles = userDoc.data().roles || [];
            const newRoles = currentRoles.filter(role => !roles.includes(role));
            
            await updateDoc(userRef, { roles: newRoles });
          }
        } catch (error) {
          state.error.value = error.message;
          throw error;
        }
      }
    } : {}),` : '';

    // Conditionally generate admin check for remove method
    const adminCheckInRemove = roles.length > 0 ? `
      // Require admin role for auth collections
      if (authCollections.includes(collectionName)) {
        this._checkRole('admin');
      }
    ` : '';

    writeFile(
      path.join(baseDir, 'useFirestoreCollectionActions.js'),
      `import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getCountFromServer,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
${authCollections.length > 0 ? `import { getAuth } from 'firebase/auth';` : ''}

// Auth collections configuration
const authCollections = ${JSON.stringify(authCollections)};

/**
 * Firestore Collection Actions Factory
 * @param {string} collectionName - Name of Firestore collection
 * @param {Object} state - Pinia store state
 * @returns {Object} Collection CRUD actions
 */
export function useFirestoreCollectionActions(collectionName, state) {
  return {${roleCheck}
    /**
     * Fetches initial page of documents from the collection
     * @async
     * @function
     * @param {Object} [options] - Fetch options
     * @param {number} [options.pageSize=10] - Number of items per page
     * @param {Object} [options.filters] - Filters to apply
     * @param {Object} [options.orderBy] - Sorting configuration
     * @returns {Promise<void>}
     */
    async fetchInitialPage(options = {}) {
      state.loading.value = true;
      try {
        // Get reference to the collection
        const colRef = collection(db, collectionName);
        
        // Build query constraints
        const constraints = [];
        
        // Apply filters if provided
        const filters = options.filters || state[collectionName].value.filters;
        if (filters && Object.keys(filters).length > 0) {
          for (const [field, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
              constraints.push(where(field, '==', value));
            }
          }
        }
        
        // Apply sorting
        const sortConfig = options.orderBy || state[collectionName].value.orderBy;
        if (sortConfig && sortConfig.field) {
          constraints.push(orderBy(sortConfig.field, sortConfig.direction || 'asc'));
        }
        
        // Set pagination size
        const pageSize = options.pageSize || state[collectionName].value.pageSize;
        constraints.push(limit(pageSize));
        
        // Execute query
        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);
        
        // Update state
        state[collectionName].value = {
          ...state[collectionName].value,
          items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize,
          filters: filters || {},
          orderBy: sortConfig || state[collectionName].value.orderBy,
          pageSize
        };
        
        // Get total count (for UI display)
        const countSnapshot = await getCountFromServer(colRef);
        state[collectionName].value.total = countSnapshot.data().count;
      } catch (error) {
        state.error.value = error.message;
        throw error;
      } finally {
        state.loading.value = false;
      }
    },

    /**
     * Fetches next page of documents (load more)
     * @async
     * @function
     * @returns {Promise<void>}
     */
    async fetchNextPage() {
      if (!state[collectionName].value.lastVisible || !state[collectionName].value.hasMore) return;
      
      state.loading.value = true;
      try {
        // Get reference to the collection
        const colRef = collection(db, collectionName);
        
        // Build query constraints
        const constraints = [];
        
        // Apply existing filters
        const filters = state[collectionName].value.filters;
        if (filters && Object.keys(filters).length > 0) {
          for (const [field, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
              constraints.push(where(field, '==', value));
            }
          }
        }
        
        // Apply existing sorting
        const sortConfig = state[collectionName].value.orderBy;
        if (sortConfig && sortConfig.field) {
          constraints.push(orderBy(sortConfig.field, sortConfig.direction || 'asc'));
        }
        
        // Add pagination
        constraints.push(startAfter(state[collectionName].value.lastVisible));
        constraints.push(limit(state[collectionName].value.pageSize));
        
        // Execute query
        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);
        
        // Update state
        state[collectionName].value = {
          ...state[collectionName].value,
          items: [...state[collectionName].value.items, ...snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }))],
          lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === state[collectionName].value.pageSize
        };
      } catch (error) {
        state.error.value = error.message;
        throw error;
      } finally {
        state.loading.value = false;
      }
    },

    /**
   * Retrieves a document from the collection by ID
   * @async
   * @function
   * @param {string} id - Document ID to retrieve
   * @returns {Promise<Object>} The retrieved document data with ID
   */
    async get(id) {
      try {
        // Create document reference
        const docRef = doc(db, collectionName, id);
        
        // Fetch document snapshot
        const docSnap = await getDoc(docRef);
        
        // Check if document exists
        if (!docSnap.exists()) {
          throw new Error("Document with ID  not found");
        }
        
        // Return document data with ID
        return { 
          id: docSnap.id, 
          ...docSnap.data() 
        };
      } catch (error) {
        state.error.value = error.message;
        throw error;
      }
    },

    /**
     * Applies new filters and fetches first page
     * @async
     * @function
     * @param {Object} filters - New filters to apply
     * @returns {Promise<void>}
     */
    async applyFilters(filters) {
      state[collectionName].value.filters = filters;
      await this.fetchInitialPage({ filters });
    },
    
    /**
     * Changes sorting and fetches first page
     * @async
     * @function
     * @param {string} field - Field to sort by
     * @param {string} [direction='asc'] - Sort direction
     * @returns {Promise<void>}
     */
    async changeSorting(field, direction = 'asc') {
      state[collectionName].value.orderBy = { field, direction };
      await this.fetchInitialPage({ orderBy: { field, direction } });
    },
    
    /**
     * Adds a new document to the collection
     * @async
     * @function
     * @param {Object} data - Document data to add
     * @returns {Promise<void>}
     */
    async add(data) {
      try {
        // For auth collections, add current user ID
        if (authCollections.includes(collectionName)) {
          if (state.currentUser.value && state.currentUser.value.uid) {
            data.createdBy = state.currentUser.value.uid;
          }
        }
        
        await addDoc(collection(db, collectionName), data);
      } catch (error) {
        state.error.value = error.message;
        throw error;
      }
    },
    
    /**
     * Updates an existing document
     * @async
     * @function
     * @param {string} id - Document ID
     * @param {Object} data - Partial document data to update
     * @returns {Promise<void>}
     */
    async update(id, data) {
      try {
        // For auth collections, add current user ID
        if (authCollections.includes(collectionName)) {
          if (state.currentUser.value && state.currentUser.value.uid) {
            data.updatedBy = state.currentUser.value.uid;
          }
        }
        
        await updateDoc(doc(db, collectionName, id), data);
      } catch (error) {
        state.error.value = error.message;
        throw error;
      }
    },

    /**
     * Search documents in the collection
     * @async
     * @function
     * @param {string} term - Search term
     * @param {string} [field='name'] - Field to search in
     * @returns {Promise<void>}
     */
    async search(term, field = 'name') {
      state.loading.value = true;
      try {
        // Store search parameters
        state[collectionName].value.search = {
          term,
          field,
          isActive: true
        };
        
        const colRef = collection(db, collectionName);
        const constraints = [];
        
        // Add search constraint
        constraints.push(
          where(field, '>=', term.toLowerCase()),
          where(field, '<=', term.toLowerCase() + '\uf8ff')
        );
        
        // Apply existing filters
        const filters = state[collectionName].value.filters;
        if (filters && Object.keys(filters).length > 0) {
          for (const [f, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
              constraints.push(where(f, '==', value));
            }
          }
        }
        
        // Execute query
        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);
        
        // Update search results
        state[collectionName].value.search.results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        state.error.value = error.message;
        throw error;
      } finally {
        state.loading.value = false;
      }
    },
    
    /**
     * Clears search results
     * @function
     */
    clearSearch() {
      state[collectionName].value.search = {
        term: '',
        field: 'name',
        results: [],
        isActive: false
      };
    },

    /**
     * Deletes a document from the collection
     * @async
     * @function
     * @param {string} id - Document ID to delete
     * @returns {Promise<void>}
     */
    async remove(id) {
      try {
        ${adminCheckInRemove}
        await deleteDoc(doc(db, collectionName, id));
      } catch (error) {
        state.error.value = error.message;
        throw error;
      }
    }${authRoleActions}
  };
}`
    );
  } catch (error) {
    throw new Error(`Error generating Firestore utility file: ${error.message}`);
  }
};