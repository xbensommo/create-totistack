import fs from 'fs-extra';
import path from 'path';
import { generateIndexFile } from './helper/generateIndexFile.js';
import { generateStateFile } from './helper/generateStateFile.js';
import { generateActivityLogger } from './helper/generateActivityLogger.js';
import { generateDocumentation } from './helper/generateDocumentation.js';
import { generateCollectionActionModule } from './helper/generateCollectionActionModule.js';
import { generateFirestoreUtilFile } from './helper/generateFirestoreUtilFile.js';
import { toCamelCase } from './helper/helperF.js';
import { generateValidationModule } from './helper/generateValidationModule.js';

/**
 * Defines the structure for a collection, including its name, fields, and data type.
 * @typedef {Object} CollectionConfig
 * @property {string} name - The name of the Firestore collection.
 * @property {Object.<string, string>} fields - An object where keys are field names and values are their data types (e.g., 'string', 'number', 'boolean', 'timestamp', 'array', 'object').
 * @property {string} [dataType='object'] - The overall data type of the documents in the collection (e.g., 'object'). Defaults to 'object'.
 */

// Shared auth collection detection
/**
 * Checks if a given collection configuration represents an authentication-related collection.
 * @param {CollectionConfig} collectionConfig - The configuration object for a collection.
 * @returns {boolean} True if the collection is considered an auth collection, false otherwise.
 */
export const isAuthCollection = (collectionConfig) => {
  const authCollections = ['users', 'user', 'customer', 'client', 'clients', 'customers', 'student', 'students', 'admins', 'admin', 'accounts', 'account'];
  return authCollections.includes(collectionConfig.name.toLowerCase());
};

/**
 * Ensures that a directory exists, creating it recursively if it doesn't.
 * @param {string} dirPath - The path to the directory to ensure.
 * @throws {Error} If the directory cannot be created.
 */
const ensureDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create directory: ${dirPath}\n${error.message}`);
  }
};

/**
 * Generates a Firebase store with specified collections, roles, and optional activity logging.
 *
 * @param {Object} options - The options for generating the store.
 * @param {string} [options.storeName='appStore'] - The name of the store.
 * @param {CollectionConfig[]} [options.collections=[]] - An array of collection configuration objects.
 * @param {string[]} [options.roles=[]] - An array of user roles for access control.
 * @param {boolean} [options.addActivityLogging=false] - Whether to add activity logging functionality.
 * @throws {Error} If required options are missing or invalid.
 */
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

    // Process collections: camelCase their names and ensure they have fields and dataType
    const processedCollections = collections.map(c => {
      if (!c.name || !c.fields) {
        throw new Error(`Collection "${JSON.stringify(c)}" is missing 'name' or 'fields' property. Each collection must have a name and define its fields.`);
      }
      return {
        ...c,
        name: toCamelCase(c.name).trim(),
        dataType: c.dataType || 'object' // Default to 'object' if not provided
      };
    }).filter(c => c.name); // Filter out any collections that ended up with an empty name after processing

    // Identify authentication-related collections
    const authCollections = processedCollections.filter(isAuthCollection);

    const baseDir = path.join('src', 'stores', storeName);
    const actionsDir = path.join(baseDir, 'actions');

    ensureDir(actionsDir);

    // Generate files in correct order
    // Pass the full processedCollections and authCollections objects to helper functions
    generateStateFile(baseDir, processedCollections, authCollections, addActivityLogging);
    generateFirestoreUtilFile(baseDir, authCollections, roles, addActivityLogging);

     // Generate collection action modules for each processed collection
    processedCollections.forEach(collectionConfig => {
      generateCollectionActionModule(baseDir, collectionConfig); // Pass the full config object
    });

    // Generate collection action modules AND validation modules
    // Use a for...of loop to correctly await asynchronous operations inside
    for (const collectionConfig of processedCollections) {
      generateCollectionActionModule(baseDir, collectionConfig);
      await generateValidationModule(baseDir, collectionConfig); // <--- AWAITING NEW VALIDATION MODULE GENERATION
    }

   

    // For generateIndexFile, it might only need the names of the collections
    generateIndexFile(
      storeName,
      baseDir,
      processedCollections.map(c => c.name), // Pass only names
      authCollections.map(c => c.name),      // Pass only names
      addActivityLogging
    );

    if (addActivityLogging) {
      generateActivityLogger(baseDir);
    }

    // Pass the full processedCollections and authCollections objects to generateDocumentation
    generateDocumentation(storeName, baseDir, processedCollections, authCollections, roles, addActivityLogging);

    console.log(`✅ Store ${storeName} generated successfully.`);
  } catch (error) {
    console.error(`❌ Error generating store: ${error.message}`);
    throw error;
  }
}