import path from 'path';
import { writeFile } from './helperF.js'; // Assumed to be available for writing files

/**
 * Generates the Firestore utility file with advanced features.
 * @param {string} baseDir - Base directory path where the file will be created.
 * @param {string[]} authC - Authentication collections (e.g., ['users']).
 * @param {string[]} roles - User roles for authorization (e.g., ['admin', 'editor', 'viewer']).
 * @param {boolean} addActivityLogging - Whether to add activity logging to a 'activityLogs' collection.
 */
export const generateFirestoreUtilFile = (baseDir, authC, roles, addActivityLogging) => {
  try {
    const authCollections = authC;
    const activityLoggingEnabled = addActivityLogging;

    // --- Conditional Code Blocks for the Generated File ---

    // 1. Role Check Function
    const roleCheck = roles.length > 0 ? `
    /**
     * Checks if the current user has the required role.
     * @param {string} requiredRole - The role string (e.g., 'admin', 'editor').
     * @throws {Error} If the user is not authenticated or lacks the required role.
     */
    _checkRole(requiredRole) {
      if (!state.currentUser.value || !state.currentUser.value.uid) {
        throw new Error('Authentication required for this operation.');
      }
      if (!state.currentUser.value.roles || !Array.isArray(state.currentUser.value.roles) || !state.currentUser.value.roles.includes(requiredRole)) {
        throw new Error(\`User lacks required role: \${requiredRole}\`);
      }
    },` : '';

    // 2. Activity Logging Function
    const activityLoggingFunction = activityLoggingEnabled ? `
    /**
     * Logs an activity to the 'activityLogs' collection.
     * @private
     * @param {string} actionType - Type of action (e.g., 'ADD', 'UPDATE', 'DELETE', 'ROLE_ASSIGN', 'TRANSACTION_COMPLETED').
     * @param {string|null} documentId - ID of the document affected, if applicable.
     * @param {Object} [details={}] - Additional details for the log entry.
     */
    async _logActivity(actionType, documentId = null, details = {}) {
      try {
        const userId = state.currentUser.value?.uid || 'anonymous';
        await addDoc(collection(db, 'activityLogs'), {
          timestamp: serverTimestamp(),
          userId,
          actionType,
          collectionName,
          documentId,
          ...details,
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
        // Do not re-throw, logging should not block main operation
      }
    },` : '';

    // 3. Auth Role Actions (assignRoles, revokeRoles)
    const authRoleActions = roles.length > 0 ? `
    , ...(authCollections.includes(collectionName) ? {
      /**
       * Assigns roles to a user document in an authentication collection.
       * Requires 'admin' role.
       * @async
       * @param {string} userId - The ID of the user document.
       * @param {string[]} rolesToAssign - An array of roles to assign.
       * @returns {Promise<void>}
       * @throws {Error} If the current user is not an admin or operation fails.
       */
      async assignRoles(userId, rolesToAssign) {
        try {
          this._checkRole('admin');
          const userRef = doc(db, collectionName, userId);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            throw new Error(\`User with ID \${userId} not found.\`);
          }

          const currentRoles = userDoc.data().roles || [];
          const newRoles = Array.from(new Set([...currentRoles, ...rolesToAssign])); // Add new roles, ensure uniqueness

          await updateDoc(userRef, { roles: newRoles });
          ${activityLoggingEnabled ? `this._logActivity('ROLE_ASSIGNED', userId, { assignedRoles: rolesToAssign });` : ''}
        } catch (error) {
          state.error.value = error.message;
          ${activityLoggingEnabled ? `this._logActivity('ROLE_ASSIGN_FAILED', userId, { error: error.message, rolesToAssign });` : ''}
          throw error;
        }
      },

      /**
       * Revokes specified roles from a user document in an authentication collection.
       * Requires 'admin' role.
       * @async
       * @param {string} userId - The ID of the user document.
       * @param {string[]} rolesToRevoke - An array of roles to revoke.
       * @returns {Promise<void>}
       * @throws {Error} If the current user is not an admin or operation fails.
       */
      async revokeRoles(userId, rolesToRevoke) {
        try {
          this._checkRole('admin');
          const userRef = doc(db, collectionName, userId);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            throw new Error(\`User with ID \${userId} not found.\`);
          }

          const currentRoles = userDoc.data().roles || [];
          const newRoles = currentRoles.filter(role => !rolesToRevoke.includes(role));

          await updateDoc(userRef, { roles: newRoles });
          ${activityLoggingEnabled ? `this._logActivity('ROLE_REVOKED', userId, { revokedRoles: rolesToRevoke });` : ''}
        } catch (error) {
          state.error.value = error.message;
          ${activityLoggingEnabled ? `this._logActivity('ROLE_REVOKE_FAILED', userId, { error: error.message, rolesToRevoke });` : ''}
          throw error;
        }
      }
    } : {}),` : '';

    // 4. Admin Check in Remove Method
    const adminCheckInRemove = roles.length > 0 ? `
      // Require admin role for auth collections
      if (authCollections.includes(collectionName)) {
        this._checkRole('admin');
      }
    ` : '';

    // --- Generated File Content ---
    const fileContent = `import {
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
  getDoc,
  writeBatch, // New: For batch operations
  runTransaction, // New: For atomic transactions
  onSnapshot, // New: For real-time listeners
  serverTimestamp // New: For timestamps in activity logs and document creation/update
} from 'firebase/firestore';
import { db } from '@/firebase'; // Assumed to be your initialized Firestore instance
${authCollections.length > 0 ? `import { getAuth } from 'firebase/auth';` : ''} // Conditionally import auth if needed

// Auth collections configured during generation
const authCollections = ${JSON.stringify(authCollections)};
const activityLoggingEnabled = ${activityLoggingEnabled};

/**
 * Helper function to build Firestore 'where' clauses based on a flexible filter object.
 * @param {Array} constraints - The array to push Firestore query constraints into.
 * @param {Object} filter - The filter object.
 * @param {string} filter.field - The field to filter on.
 * @param {string} filter.operator - The comparison operator (e.g., '==', '!=', '<', '>', '<=', '>=', 'array-contains', 'array-contains-any', 'in', 'not-in').
 * @param {*} filter.value - The value to compare against.
 * @throws {Error} If an unsupported operator is provided.
 */
function buildWhereClause(constraints, filter) {
  const { field, operator, value } = filter;
  if (value === undefined || value === null || value === '') {
    return; // Skip empty filters
  }

  switch (operator) {
    case '==':
    case '!=':
    case '<':
    case '<=':
    case '>':
    case '>=':
    case 'array-contains':
      constraints.push(where(field, operator, value));
      break;
    case 'array-contains-any':
    case 'in':
    case 'not-in':
      if (!Array.isArray(value)) {
        throw new Error(\`Value for '\${operator}' operator must be an array.\`);
      }
      constraints.push(where(field, operator, value));
      break;
    default:
      throw new Error(\`Unsupported filter operator: \${operator}\`);
  }
}

/**
 * Firestore Collection Actions Factory
 * Provides a set of reusable actions for interacting with a specific Firestore collection.
 * @param {string} collectionName - Name of the Firestore collection.
 * @param {Object} state - A reactive state object (e.g., Pinia store state) that should contain:
 * - \`state[collectionName].value\`: Object holding items, pagination info, filters, etc.
 * - \`state.loading.value\`: Boolean for global loading state.
 * - \`state.error.value\`: String for global error message.
 * - \`state.currentUser.value\`: Object with \`uid\` and \`roles\` (if authentication is enabled).
 * - \`state.unsubscribeFunctions.value\`: Object to store real-time listener unsubscribe functions (optional).
 * @returns {Object} An object containing collection CRUD, pagination, search, role, batch, and transaction actions.
 */
export function useFirestoreCollectionActions(collectionName, state) {
  ${roleCheck}
  ${activityLoggingFunction}

  /**
   * Private helper to get a new Firestore WriteBatch instance.
   * @returns {firebase.firestore.WriteBatch} A new batch instance.
   */
  const _getBatch = () => writeBatch(db);

  return Object.freeze({ // Freeze the object to prevent accidental modification
    /**
     * Fetches the initial page of documents from the collection.
     * @async
     * @param {Object} [options] - Fetch options.
     * @param {number} [options.pageSize=10] - Number of items per page.
     * @param {Array<Object>} [options.filters] - Array of filter objects (e.g., [{field: 'category', operator: '==', value: 'electronics'}]).
     * @param {Object} [options.orderBy] - Sorting configuration ({ field: string, direction: 'asc' | 'desc' }).
     * @returns {Promise<void>}
     * @throws {Error} If the fetch operation fails.
     */
    async fetchInitialPage(options = {}) {
      state.loading.value = true;
      try {
        const colRef = collection(db, collectionName);
        const constraints = [];

        // Apply filters if provided
        const filters = options.filters || state[collectionName].value.filters || [];
        for (const filter of filters) {
          buildWhereClause(constraints, filter);
        }

        // Apply sorting
        const sortConfig = options.orderBy || state[collectionName].value.orderBy;
        if (sortConfig && sortConfig.field) {
          constraints.push(orderBy(sortConfig.field, sortConfig.direction || 'asc'));
        }

        // Set pagination size
        const pageSize = options.pageSize || state[collectionName].value.pageSize || 10;
        constraints.push(limit(pageSize));

        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);

        state[collectionName].value = {
          ...state[collectionName].value,
          items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize,
          filters: filters,
          orderBy: sortConfig,
          pageSize
        };

        const countSnapshot = await getCountFromServer(q); // Use 'q' to count filtered/ordered results
        state[collectionName].value.total = countSnapshot.data().count;

        ${activityLoggingEnabled ? `this._logActivity('FETCH_INITIAL_PAGE', null, { collectionName, count: snapshot.docs.length, filters, orderBy: sortConfig });` : ''}
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('FETCH_INITIAL_PAGE_FAILED', null, { collectionName, error: error.message });` : ''}
        throw error;
      } finally {
        state.loading.value = false;
      }
    },

    /**
     * Fetches the next page of documents (for infinite scrolling/load more).
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If the fetch operation fails.
     */
    async fetchNextPage() {
      if (!state[collectionName].value.lastVisible || !state[collectionName].value.hasMore) {
        console.warn('No more documents to load or lastVisible is null.');
        return;
      }

      state.loading.value = true;
      try {
        const colRef = collection(db, collectionName);
        const constraints = [];

        // Apply existing filters
        const filters = state[collectionName].value.filters || [];
        for (const filter of filters) {
          buildWhereClause(constraints, filter);
        }

        // Apply existing sorting
        const sortConfig = state[collectionName].value.orderBy;
        if (sortConfig && sortConfig.field) {
          constraints.push(orderBy(sortConfig.field, sortConfig.direction || 'asc'));
        }

        // Add pagination
        constraints.push(startAfter(state[collectionName].value.lastVisible));
        constraints.push(limit(state[collectionName].value.pageSize));

        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);

        state[collectionName].value = {
          ...state[collectionName].value,
          items: [...state[collectionName].value.items, ...snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))],
          lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === state[collectionName].value.pageSize
        };
        ${activityLoggingEnabled ? `this._logActivity('FETCH_NEXT_PAGE', null, { collectionName, count: snapshot.docs.length });` : ''}
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('FETCH_NEXT_PAGE_FAILED', null, { collectionName, error: error.message });` : ''}
        throw error;
      } finally {
        state.loading.value = false;
      }
    },

    /**
     * Retrieves a single document from the collection by ID.
     * @async
     * @param {string} id - Document ID to retrieve.
     * @returns {Promise<Object|null>} The retrieved document data with ID, or null if not found.
     * @throws {Error} If the retrieval operation fails.
     */
    async get(id) {
      try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          ${activityLoggingEnabled ? `this._logActivity('GET_DOCUMENT_NOT_FOUND', id, { collectionName });` : ''}
          return null; // Document not found
        }
        ${activityLoggingEnabled ? `this._logActivity('GET_DOCUMENT', id, { collectionName });` : ''}
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('GET_DOCUMENT_FAILED', id, { collectionName, error: error.message });` : ''}
        throw error;
      }
    },

    /**
     * Applies new filters and fetches the first page of documents.
     * @async
     * @param {Array<Object>} filters - New filters to apply (e.g., [{field: 'status', operator: '==', value: 'active'}]).
     * @returns {Promise<void>}
     */
    async applyFilters(filters) {
      state[collectionName].value.filters = filters;
      await this.fetchInitialPage({ filters });
    },

    /**
     * Changes sorting configuration and fetches the first page of documents.
     * @async
     * @param {string} field - Field to sort by.
     * @param {string} [direction='asc'] - Sort direction ('asc' or 'desc').
     * @returns {Promise<void>}
     */
    async changeSorting(field, direction = 'asc') {
      state[collectionName].value.orderBy = { field, direction };
      await this.fetchInitialPage({ orderBy: { field, direction } });
    },

    /**
     * Adds a new document to the collection.
     * @async
     * @param {Object} data - Document data to add.
     * @returns {Promise<string>} The ID of the newly added document.
     * @throws {Error} If the add operation fails.
     */
    async add(data) {
      try {
        const docData = { ...data, createdAt: serverTimestamp() };
        // For auth collections, add current user ID
        if (authCollections.includes(collectionName) && state.currentUser.value && state.currentUser.value.uid) {
          docData.createdBy = state.currentUser.value.uid;
        }

        const docRef = await addDoc(collection(db, collectionName), docData);
        ${activityLoggingEnabled ? `this._logActivity('ADD_DOCUMENT', docRef.id, { collectionName, data: docData });` : ''}
        return docRef.id;
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('ADD_DOCUMENT_FAILED', null, { collectionName, error: error.message, data });` : ''}
        throw error;
      }
    },

    /**
     * Updates an existing document in the collection.
     * @async
     * @param {string} id - Document ID.
     * @param {Object} data - Partial document data to update.
     * @returns {Promise<void>}
     * @throws {Error} If the update operation fails.
     */
    async update(id, data) {
      try {
        const docData = { ...data, updatedAt: serverTimestamp() };
        // For auth collections, add current user ID
        if (authCollections.includes(collectionName) && state.currentUser.value && state.currentUser.value.uid) {
          docData.updatedBy = state.currentUser.value.uid;
        }

        await updateDoc(doc(db, collectionName, id), docData);
        ${activityLoggingEnabled ? `this._logActivity('UPDATE_DOCUMENT', id, { collectionName, data: docData });` : ''}
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('UPDATE_DOCUMENT_FAILED', id, { collectionName, error: error.message, data });` : ''}
        throw error;
      }
    },

    /**
     * Searches documents in the collection based on a term and field(s).
     * This performs a prefix search. For more advanced full-text search, consider dedicated solutions like Algolia.
     * @async
     * @param {string} term - Search term.
     * @param {string|string[]} [fields='name'] - Field(s) to search in. If multiple, it will perform OR logic (separate queries).
     * @returns {Promise<void>}
     * @throws {Error} If the search operation fails.
     */
    async search(term, fields = 'name') {
      state.loading.value = true;
      try {
        state[collectionName].value.search = {
          term,
          fields: Array.isArray(fields) ? fields : [fields],
          results: [],
          isActive: true
        };

        const colRef = collection(db, collectionName);
        const searchPromises = [];
        const searchFields = Array.isArray(fields) ? fields : [fields];

        for (const field of searchFields) {
          const constraints = [];
          // Add prefix search constraint
          constraints.push(
            where(field, '>=', term.toLowerCase()),
            where(field, '<=', term.toLowerCase() + '\\uf8ff')
          );

          // Apply existing filters (if any)
          const filters = state[collectionName].value.filters || [];
          for (const filter of filters) {
            // Ensure search field is not duplicated if already in filters
            if (filter.field !== field) {
              buildWhereClause(constraints, filter);
            }
          }
          searchPromises.push(getDocs(query(colRef, ...constraints)));
        }

        const snapshots = await Promise.all(searchPromises);
        let allResults = [];
        const seenIds = new Set(); // To handle duplicates if searching multiple fields

        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            if (!seenIds.has(doc.id)) {
              allResults.push({ id: doc.id, ...doc.data() });
              seenIds.add(doc.id);
            }
          });
        });

        state[collectionName].value.search.results = allResults;
        ${activityLoggingEnabled ? `this._logActivity('SEARCH_COLLECTION', null, { collectionName, term, fields, count: allResults.length });` : ''}
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('SEARCH_COLLECTION_FAILED', null, { collectionName, term, fields, error: error.message });` : ''}
        throw error;
      } finally {
        state.loading.value = false;
      }
    },

    /**
     * Clears search results and deactivates search mode.
     */
    clearSearch() {
      state[collectionName].value.search = {
        term: '',
        fields: ['name'],
        results: [],
        isActive: false
      };
      ${activityLoggingEnabled ? `this._logActivity('CLEAR_SEARCH', null, { collectionName });` : ''}
    },

    /**
     * Deletes a document from the collection.
     * Requires 'admin' role if the collection is an authentication collection.
     * @async
     * @param {string} id - Document ID to delete.
     * @returns {Promise<void>}
     * @throws {Error} If the delete operation fails or user lacks role.
     */
    async remove(id) {
      try {
        ${adminCheckInRemove}
        await deleteDoc(doc(db, collectionName, id));
        ${activityLoggingEnabled ? `this._logActivity('DELETE_DOCUMENT', id, { collectionName });` : ''}
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('DELETE_DOCUMENT_FAILED', id, { collectionName, error: error.message });` : ''}
        throw error;
      }
    },

    /**
     * Executes a Firestore transaction. This allows for atomic read-and-write operations.
     * @async
     * @param {Function} updateFunction - A function that takes a Transaction object as its first argument
     * and returns a Promise. Inside this function, use transaction.get() and transaction.set()/update()/delete().
     * Example: async (transaction) => { const sfDoc = await transaction.get(sfDocRef); transaction.update(sfDocRef, { population: newPop }); }
     * @returns {Promise<any>} The result returned by the updateFunction.
     * @throws {Error} If the transaction fails.
     */
    async runTransaction(updateFunction) {
      try {
        const result = await runTransaction(db, updateFunction);
        ${activityLoggingEnabled ? `this._logActivity('TRANSACTION_COMPLETED', null, { collectionName, transactionDetails: 'Custom transaction executed' });` : ''}
        return result;
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('TRANSACTION_FAILED', null, { collectionName, error: error.message });` : ''}
        throw error;
      }
    },

    /**
     * Initiates a new Firestore WriteBatch. Use this to group multiple write operations.
     * Remember to call commitBatch() to apply the changes.
     * @returns {firebase.firestore.WriteBatch} A new batch instance.
     */
    createBatch() {
      return _getBatch();
    },

    /**
     * Adds a document operation to a given batch. Generates a new ID for the document.
     * @param {firebase.firestore.WriteBatch} batch - The batch instance.
     * @param {Object} data - The document data to add.
     * @returns {string} The ID of the document that will be added.
     */
    batchAdd(batch, data) {
      const docRef = doc(collection(db, collectionName)); // Firestore generates ID
      batch.set(docRef, { ...data, createdAt: serverTimestamp() });
      return docRef.id; // Return the ID generated for the new document
    },

    /**
     * Updates a document operation to a given batch.
     * @param {firebase.firestore.WriteBatch} batch - The batch instance.
     * @param {string} id - The ID of the document to update.
     * @param {Object} data - The partial document data to update.
     */
    batchUpdate(batch, id, data) {
      batch.update(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() });
    },

    /**
     * Deletes a document operation from a given batch.
     * @param {firebase.firestore.WriteBatch} batch - The batch instance.
     * @param {string} id - The ID of the document to delete.
     */
    batchDelete(batch, id) {
      batch.delete(doc(db, collectionName, id));
    },

    /**
     * Commits the changes in the provided batch.
     * @async
     * @param {firebase.firestore.WriteBatch} batch - The batch instance to commit.
     * @returns {Promise<void>}
     * @throws {Error} If the batch commit fails.
     */
    async commitBatch(batch) {
      try {
        await batch.commit();
        ${activityLoggingEnabled ? `this._logActivity('BATCH_COMMITTED', null, { collectionName, operations: 'multiple' });` : ''}
      } catch (error) {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('BATCH_FAILED', null, { collectionName, error: error.message });` : ''}
        throw error;
      }
    },

    /**
     * Subscribes to real-time updates for the collection.
     * The callback will be triggered immediately with the current data and then on every subsequent change.
     * @param {Function} callback - A function that receives the updated array of items.
     * Signature: \`(items: Array<Object>) => void\`.
     * @param {Object} [options] - Options for the query (filters, orderBy, limit).
     * @param {Array<Object>} [options.filters] - Array of filter objects.
     * @param {Object} [options.orderBy] - Sorting configuration.
     * @param {number} [options.limit] - Maximum number of documents to return.
     * @returns {Function} An unsubscribe function to stop listening for updates.
     */
    subscribeToCollection(callback, options = {}) {
      const colRef = collection(db, collectionName);
      const constraints = [];

      // Apply filters
      const filters = options.filters || [];
      for (const filter of filters) {
        buildWhereClause(constraints, filter);
      }

      // Apply sorting
      const sortConfig = options.orderBy || {};
      if (sortConfig && sortConfig.field) {
        constraints.push(orderBy(sortConfig.field, sortConfig.direction || 'asc'));
      }

      // Apply limit
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(colRef, ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
        ${activityLoggingEnabled ? `this._logActivity('SNAPSHOT_RECEIVED', null, { collectionName, count: items.length, filters, orderBy: sortConfig, limit: options.limit });` : ''}
      }, (error) => {
        state.error.value = error.message;
        ${activityLoggingEnabled ? `this._logActivity('SNAPSHOT_ERROR', null, { collectionName, error: error.message });` : ''}
        console.error(\`Error subscribing to \${collectionName} collection:\`, error);
      });

      // Store unsubscribe function in state for later cleanup, if state provides this mechanism
      if (state.unsubscribeFunctions && state.unsubscribeFunctions.value) {
        state.unsubscribeFunctions.value[collectionName] = unsubscribe;
      }
      return unsubscribe;
    },

    /**
     * Unsubscribes from real-time updates for the collection.
     * This assumes the unsubscribe function was stored in state.unsubscribeFunctions.value[collectionName].
     */
    unsubscribeFromCollection() {
      if (state.unsubscribeFunctions && state.unsubscribeFunctions.value[collectionName]) {
        state.unsubscribeFunctions.value[collectionName]();
        delete state.unsubscribeFunctions.value[collectionName];
        ${activityLoggingEnabled ? `this._logActivity('UNSUBSCRIBED', null, { collectionName });` : ''}
      } else {
        console.warn(\`No active subscription found for \${collectionName}.\`);
      }
    }${authRoleActions}
  });
}`;

    // Write the generated file
    writeFile(
      path.join(baseDir, 'useFirestoreCollectionActions.js'),
      fileContent
    );
  } catch (error) {
    throw new Error(`Error generating Firestore utility file: ${error.message}`);
  }
};
