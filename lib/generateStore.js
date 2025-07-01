import fs from 'fs-extra';
import path from 'path';
import { generateIndexFile } from './helper/generateIndexFile.js';
import { generateStateFile } from './helper/generateStateFile.js';
import { generateActivityLogger } from './helper/generateActivityLogger.js';
import { generateDocumentation } from './helper/generateDocumentation.js';
import { generateCollectionActionModule } from './helper/generateCollectionActionModule.js';
import { generateFirestoreUtilFile } from './helper/generateFirestoreUtilFile.js';
import { toCamelCase } from './helper/helperF.js';

// Shared auth collection detection
export const isAuthCollection = (collectionName) => {
  const authCollections = ['users', 'user', 'customer', 'client', 'clients', 'customers', 'student','students', 'admins', 'admin', 'accounts', 'account'];
  return authCollections.includes(collectionName.toLowerCase());
};

const ensureDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create directory: ${dirPath}\n${error.message}`);
  }
};

export default async function generateStore(options) {
  try {
    const {
      storeName = 'appStore',
      collections = [],
      roles = [],
      addActivityLogging = false
    } = options;

    // Validate inputs
    if (!storeName) throw new Error('Store name is required');
    if (!collections || collections.length === 0) throw new Error('At least one collection is required');
    
    // Process collections
    const processedCollections = collections.map(c => toCamelCase(c).trim()).filter(Boolean);
    const authCollections = processedCollections.filter(isAuthCollection);

    const baseDir = path.join('src', 'stores', storeName);
    const actionsDir = path.join(baseDir, 'actions');

    ensureDir(actionsDir);

    // Generate files in correct order
    generateStateFile(baseDir, processedCollections, authCollections, addActivityLogging);
    generateFirestoreUtilFile(baseDir, authCollections, roles, addActivityLogging);
    
    // Generate collection action modules
    processedCollections.forEach(collection => {
      generateCollectionActionModule(baseDir, collection);
    });

    generateIndexFile(storeName, baseDir, processedCollections, authCollections, addActivityLogging);

    if (addActivityLogging) {
      generateActivityLogger(baseDir);
    }

    generateDocumentation(storeName, baseDir, processedCollections, authCollections, roles, addActivityLogging);

    console.log(`✅ Store ${storeName} generated successfully.`);
  } catch (error) {
    console.error(`❌ Error generating store: ${error.message}`);
    throw error;
  }
}