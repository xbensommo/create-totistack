import path from 'path';
import { capitalize, writeFile } from './helperF.js'; // Assuming helperF.js contains capitalize and writeFile

/**
 * @typedef {Object} CollectionConfig
 * @property {string} name - The name of the Firestore collection.
 * @property {Object.<string, string>} fields - An object where keys are field names and values are their data types.
 * @property {string} [dataType='object'] - The overall data type of the documents in the collection.
 */

/**
 * Generates the STORE_GUIDE.md documentation file for the Pinia/Firestore store.
 * @param {string} storeName - The base name of the store (e.g., 'appStore').
 * @param {string} baseDir - The base directory path for the store (e.g., 'src/stores/appStore').
 * @param {CollectionConfig[]} collections - Array of all collection configuration objects.
 * @param {CollectionConfig[]} authCollections - Array of authentication-related collection configuration objects.
 * @param {string[]} roles - Array of defined user roles.
 * @param {boolean} addActivityLogging - Whether activity logging is enabled.
 */
export const generateDocumentation = (storeName, baseDir, collections, authCollections, roles, addActivityLogging) => {
  try {
    const pascalStoreName = capitalize(storeName);
    const storeDocPath = path.join(baseDir, 'STORE_GUIDE.md');
    
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Generate collection-specific documentation
    const collectionDocs = collections.map(colConfig => { // Renamed 'col' to 'colConfig' for clarity
      const pascalColName = capitalize(colConfig.name); // Access .name property
      // Check if this specific collection is one of the authentication collections
      const isAuth = authCollections.some(authCol => authCol.name === colConfig.name); 
      
      return `### ${pascalColName} Collection

**Firestore Fundamentals:**
- \`collection()\`: References a Firestore collection
- \`doc()\`: References a specific document
- \`getDoc()\`: Fetches a document once
- \`onSnapshot()\`: Real-time document listener
- \`query()\`: Creates complex queries
- \`addDoc()\`: Creates new documents
- \`updateDoc()\`: Updates existing documents
- \`deleteDoc()\`: Removes documents

**State Structure:**
\`\`\`javascript
${colConfig.name}: { // Use .name property here
  items: [],          // Firestore documents
  lastVisible: null,  // Pagination cursor (startAfter)
  hasMore: true,      // More documents available
  filters: {},        // Firestore where() clauses
  orderBy: {          // Firestore orderBy()
    field: 'createdAt',
    direction: 'desc'
  },
  pageSize: 10,       // Firestore limit()
  search: {           // Firestore text search
    term: '',
    field: 'name',
    results: [],
    isActive: false
  }
}
\`\`\`

**Actions:**
- \`fetchInitialPage${pascalColName}(options)\`: Initial query (uses Firestore's \`query()\`)
- \`fetchNextPage${pascalColName}()\`: Pagination (uses \`startAfter()\`)
- \`apply${pascalColName}Filters(filters)\`: Converts to Firestore \`where()\` clauses
- \`change${pascalColName}Sorting(field, direction)\`: Updates \`orderBy()\`
- \`search${pascalColName}(term, field)\`: Implements Firestore text search
- \`add${pascalColName}(data)\`: Uses Firestore \`addDoc()\`
- \`update${pascalColName}(id, data)\`: Uses Firestore \`updateDoc()\`
- \`delete${pascalColName}(id)\`: Uses Firestore \`deleteDoc()\`${
  isAuth && roles.length > 0 ? `
- \`assign${pascalColName}Roles(userId, roles)\`: Updates custom claims
- \`revoke${pascalColName}Roles(userId, roles)\`: Modifies custom claims` : ''}

**Example Usage:**
\`\`\`javascript
// Initialize with Firestore query
await store.fetchInitialPage${pascalColName}({
  pageSize: 20,
  filters: { status: 'active' },  // → where('status', '==', 'active')
  orderBy: { field: 'name', direction: 'asc' }  // → orderBy('name', 'asc')
});

// Add new document (Firestore addDoc)
await store.add${pascalColName}({
  name: 'New Item',
  createdAt: serverTimestamp()  // Use Firestore timestamps
});

// Text search (Firestore query constraints)
await store.search${pascalColName}('premium', 'category');
\`\`\`
`;
    }).join('\n\n');
    
    // Firebase Auth explanation
    const authDocs = authCollections.length > 0 ? `## 🔐 Firebase Authentication

### Core Concepts:
- \`createUserWithEmailAndPassword()\`: User registration
- \`signInWithEmailAndPassword()\`: Authentication
- \`sendPasswordResetEmail()\`: Password recovery
- \`updateProfile()\`: Profile management
- \`onAuthStateChanged()\`: Session persistence
- Custom Claims: Role-based permissions

**Methods:**
- \`login(email, password)\`: Uses \`signInWithEmailAndPassword()\`
- \`signUp(email, password, profileData)\`: Uses \`createUserWithEmailAndPassword()\`
- \`sendPasswordReset(email)\`: Uses \`sendPasswordResetEmail()\`
- \`updateProfile(profileData)\`: Uses \`updateProfile()\`: Uses \`updateProfile()\`
- \`changePassword(newPassword)\`: Uses \`reauthenticateWithCredential()\`

**Security Example:**
\`\`\`javascript
// Firebase Security Rules
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.admin == true;
}
\`\`\`
` : '';

    // Documentation content
    const content = `# ${pascalStoreName} Store Guide

> **Enterprise Pinia + Firestore** > *Generated on ${generatedDate}*

## Table of Contents
1. [Firestore Fundamentals](#-firestore-fundamentals)
2. [Store Structure](#-store-structure)
3. [Collections](#-collections-documentation)
${authCollections.length > 0 ? '4. [Authentication](#-firebase-authentication)' : ''}
${addActivityLogging ? `${authCollections.length > 0 ? '5' : '4'}. [Activity Logging](#-activity-logging)` : ''}
5. [Best Practices](#-enterprise-best-practices)

## 🔥 Firestore Fundamentals
### Core Operations:
\`\`\`javascript
// Initialize
import { getFirestore } from 'firebase/firestore';
const db = getFirestore(app);

// CRUD Operations
const docRef = doc(db, 'collection', 'id');       // Document reference
const colRef = collection(db, 'collection');      // Collection reference

await getDoc(docRef);                           // Read document
await addDoc(colRef, { data });                 // Create document
await updateDoc(docRef, { updatedField: value }); // Update document
await deleteDoc(docRef);                        // Delete document

// Querying
const q = query(
  colRef, 
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(25)
);
const snapshot = await getDocs(q);
\`\`\`

### Real-time Listeners:
\`\`\`javascript
const unsubscribe = onSnapshot(q, (q), (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') console.log('New: ', change.doc.data());
  });
});

// Cleanup when component unmounts
onUnmounted(() => unsubscribe());
\`\`\`

## 🏗️ Store Structure
\`\`\`
stores/
└── ${storeName}/
    ├── actions/              # Firestore operations
    ├── index.js              # Pinia store definition
    └── STORE_GUIDE.md        # This documentation
\`\`\`

## 📚 Collections Documentation
${collectionDocs}

${authDocs}

${addActivityLogging ? `## 📝 Activity Logging
### Implementation:
\`\`\`javascript
// Firestore collection structure
activities/
  ├── activityId
  │   ├── type: 'USER_UPDATE'
  │   ├── userId: 'user_123'
  │   ├── timestamp: serverTimestamp()
  │   └── metadata: { ... }
\`\`\`
` : ''}

## 🏆 Enterprise Best Practices
### Firestore Optimization:
\`\`\`javascript
// ✅ Composite indexes for queries
// ✅ Security rules with request.auth
// ✅ Batched writes for atomic operations
// ✅ Server timestamps for consistency

// ❌ Avoid deep nesting (max 100 levels)
// ❌ Avoid frequent document writes (>1/sec)
\`\`\`

### Security Rules:
\`\`\`javascript
// Example role-based access
match /orders/{orderId} {
  allow read: if request.auth != null;
  allow create: if request.auth.token.roles.has('orderManager');
  allow update: if resource.data.userId == request.auth.uid;
  allow delete: if false;  // Disable deletes
}
\`\`\`

---

> **Firestore Pro Tip** > Use \`serverTimestamp()\` instead of client-side dates for consistency across devices
> 
> *Documentation generated by Pinia/Firestore Store Generator v3.0*
`;

    writeFile(storeDocPath, content);
    console.log(`📘 Documentation generated: ${storeDocPath}`);
  } catch (error) {
    console.error('❌ Documentation error:', error.message);
  }
};