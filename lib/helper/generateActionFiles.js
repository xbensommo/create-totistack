import path from 'path';
import {toCamel ,writeFile,toCamelCase,capitalize} from './helperF.js'

/**
 * Generates action files for each collection
 * @param {string} actionsDir - Actions directory path
 * @param {string[]} collections - Array of collection names
 * @param {string[]} authCollections - Authentication collections
 * @param {string[]} roles - User roles for authorization
 */
export const generateActionFiles = (actionsDir, collections, authCollections, roles) => {
  try {
    for (const col of collections) {
      const camelCol = toCamel(col);
      const pascalCol = capitalize(camelCol);
      const isAuth = authCollections.includes(col);
      
      // Add role-specific exports for auth collections
      const roleExports = isAuth && roles.length > 0 ? `
/**
 * Assigns roles to a user
 * @function
 * @param {string} userId - User ID
 * @param {string[]} roles - Roles to assign
 * @returns {Promise<void>}
 */
export const assign${pascalCol}Roles = actions.assignRoles;

/**
 * Revokes roles from a user
 * @function
 * @param {string} userId - User ID
 * @param {string[]} roles - Roles to revoke
 * @returns {Promise<void>}
 */
export const revoke${pascalCol}Roles = actions.revokeRoles;` : '';

      writeFile(
        path.join(actionsDir, `${col}.js`),
        `import { useFirestoreCollectionActions } from '../useFirestoreCollectionActions.js';

const actions = useFirestoreCollectionActions('${col}');

/**
 * Fetches initial page of ${col} documents
 * @function
 * @param {Object} [options] - Fetch options
 * @param {number} [options.pageSize] - Items per page
 * @param {Object} [options.filters] - Filters to apply
 * @param {Object} [options.orderBy] - Sorting configuration
 * @returns {Promise<void>}
 */
export const fetchInitialPage${pascalCol} = actions.fetchInitialPage;

/**
 * Fetches next page of ${col} documents (load more)
 * @function
 * @returns {Promise<void>}
 */
export const fetchNextPage${pascalCol} = actions.fetchNextPage;

/**
 * Applies filters to ${col} collection
 * @function
 * @param {Object} filters - Filter configuration
 * @returns {Promise<void>}
 */
export const apply${pascalCol}Filters = actions.applyFilters;

/**
 * Changes sorting of ${col} collection
 * @function
 * @param {string} field - Field to sort by
 * @param {string} [direction='asc'] - Sort direction
 * @returns {Promise<void>}
 */
export const change${pascalCol}Sorting = actions.changeSorting;

/**
 * Adds a new ${col} document
 * @function
 * @param {Object} data - ${pascalCol} data to add
 * @returns {Promise<void>}
 */
export const add${pascalCol} = actions.add;

/**
 * Updates an existing ${col} document
 * @function
 * @param {string} id - Document ID
 * @param {Object} data - Partial ${pascalCol} data to update
 * @returns {Promise<void>}
 */
export const update${pascalCol} = actions.update;

/**
 * Searches ${col} documents
 * @function
 * @param {string} term - Search term
 * @param {string} [field] - Field to search in
 * @returns {Promise<void>}
 */
export const search${pascalCol} = actions.search;

/**
 * Clears ${col} search results
 * @function
 */
export const clear${pascalCol}Search = actions.clearSearch;

/**
 * Deletes a ${col} document
 * @function
 * @param {string} id - Document ID to delete
 * @returns {Promise<void>}
 */
export const delete${pascalCol} = actions.remove;${roleExports}`
      );
    }
  } catch (error) {
    throw new Error(`Error generating action files: ${error.message}`);
  }
}
