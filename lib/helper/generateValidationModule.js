// helper/generateValidationModule.js
import fs from 'fs-extra';
import path from 'path';

/**
 * @typedef {Object} CollectionConfig
 * @property {string} name - The name of the Firestore collection.
 * @property {Object.<string, string>} fields - An object where keys are field names and values are their data types (e.g., 'string', 'number', 'boolean', 'timestamp', 'array', 'object', 'email').
 * @property {string} [dataType='object'] - The overall data type of the documents in the collection.
 */

/**
 * Generates an async Vue validator module for a specific collection.
 * This validator checks for:
 * 1. Required fields.
 * 2. Correct data types (string, number, boolean, array, object, timestamp).
 * 3. Valid email format (for 'email' type fields).
 * 4. Email existence using Firebase Auth's fetchSignInMethodsForEmail (for 'email' type fields).
 *
 * @param {string} baseDir - The base directory of the store (e.g., 'src/stores/appStore'). Used for relative pathing.
 * @param {CollectionConfig} collectionConfig - The configuration object for the collection.
 */
export async function generateValidationModule(baseDir, collectionConfig) {
  const { name: collectionName, fields } = collectionConfig;
  // Capitalize the first letter of the collection name for the function name
  const capitalizeCollectionName = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);

  let requiredFieldChecks = [];
  let typeChecks = [];
  let emailExistenceChecks = [];
  let emailFields = []; // To store field names that are of type 'email' for later existence check

  for (const fieldName in fields) {
    const fieldType = fields[fieldName];

    // 1. Required field check:
    // Assumes all fields defined in 'fields' are required.
    // Checks for undefined, null, or empty string after trimming.
    requiredFieldChecks.push(`  if (data.${fieldName} === undefined || data.${fieldName} === null || String(data.${fieldName}).trim() === '') {
    errors.push('${fieldName} is required.');
  }`);

    // 2. Data type and format checks
    let typeCheckCondition = '';
    let typeErrorMessage = '';

    switch (fieldType) {
      case 'string':
        typeCheckCondition = `typeof data.${fieldName} !== 'string'`;
        typeErrorMessage = `'${fieldName}' must be a string.`;
        break;
      case 'number':
        // Check if it's not a number OR if it's NaN (e.g., Number('abc'))
        typeCheckCondition = `typeof data.${fieldName} !== 'number' || isNaN(data.${fieldName})`;
        typeErrorMessage = `'${fieldName}' must be a number.`;
        break;
      case 'boolean':
        typeCheckCondition = `typeof data.${fieldName} !== 'boolean'`;
        typeErrorMessage = `'${fieldName}' must be a boolean.`;
        break;
      case 'array':
        typeCheckCondition = `!Array.isArray(data.${fieldName})`;
        typeErrorMessage = `'${fieldName}' must be an array.`;
        break;
      case 'object':
        // Check if it's an object, not an array, and not null (typeof null === 'object')
        typeCheckCondition = `typeof data.${fieldName} !== 'object' || Array.isArray(data.${fieldName}) || data.${fieldName} === null`;
        typeErrorMessage = `'${fieldName}' must be an object.`;
        break;
      case 'timestamp':
        // Assumes data.${fieldName} is either an ISO string or a Date object.
        // Tries to parse it into a Date and checks if it's a valid date.
        typeCheckCondition = `(typeof data.${fieldName} !== 'string' && !(data.${fieldName} instanceof Date)) || isNaN(new Date(data.${fieldName}).getTime())`;
        typeErrorMessage = `'${fieldName}' must be a valid date or timestamp string.`;
        break;
      case 'email':
        // Email format check using a regex
        typeCheckCondition = `typeof data.${fieldName} !== 'string' || !/^\\S+@\\S+\\.\\S+$/.test(data.${fieldName})`;
        typeErrorMessage = `'${fieldName}' must be a valid email format.`;
        emailFields.push(fieldName); // Mark this field for the async email existence check
        break;
      // Add more cases for other specific types if needed (e.g., 'url', 'phone', 'uuid')
      default:
        // For unknown types, no specific type check, but required check still applies.
        break;
    }

    // Only apply type/format check if the field is present and not just an empty string,
    // as the required check already covers its absence/emptiness.
    if (typeCheckCondition) {
      typeChecks.push(`  if (data.${fieldName} !== undefined && data.${fieldName} !== null && String(data.${fieldName}).trim() !== '' && ${typeCheckCondition}) {
    errors.push(${typeErrorMessage});
  }`);
    }
  }

  // 3. Email existence check using Firebase Auth
  if (emailFields.length > 0) {
    emailExistenceChecks.push(`  // Initialize Firebase Auth instance for email existence checks
  const auth = getAuth();`);

    emailFields.forEach(emailField => {
      // Only attempt email existence check if the email has a valid format and is not empty.
      // This prevents unnecessary Firebase calls and errors for malformed or missing emails.
      emailExistenceChecks.push(`  if (typeof data.${emailField} === 'string' && data.${emailField}.trim() !== '' && /^\\S+@\\S+\\.\\S+$/.test(data.${emailField})) {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, data.${emailField});
      if (signInMethods && signInMethods.length > 0) {
        errors.push('The email address \\'${emailField}\\' is already in use.');
      }
    } catch (error) {
      // Log the error for debugging purposes (e.g., network issues, Firebase config problems).
      // Decide if you want to expose a user-facing error for this specific failure.
      console.error('Error checking email existence for ${emailField}:', error);
      // Optional: errors.push('Failed to verify email existence. Please try again.');
    }
  }`);
    });
  }

  const fileContent = `import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';

/**
 * Async validation module for the ${collectionName} collection.
 * Checks for:
 * - Required fields.
 * - Correct data types.
 * - Valid email format (for 'email' type fields).
 * - Email existence using Firebase Auth (for 'email' type fields).
 *
 * @param {Object} data - The data object to validate against the collection schema.
 * @returns {Promise<string[]>} A promise that resolves to an array of error messages.
 * An empty array means validation passed.
 */
export async function validate${capitalizeCollectionName}(data) {
  const errors = [];

  // Ensure data is an object to prevent errors if null/undefined is passed
  data = data || {};

  // 1. Required field checks
${requiredFieldChecks.join('\n\n')}

  // 2. Data type and format checks (only if field is present)
${typeChecks.join('\n\n')}

  // 3. Email existence checks (asynchronous and only if email format is valid)
${emailExistenceChecks.join('\n\n')}

  return errors;
}
`;

  // The validators should be placed in a common 'src/validators' directory.
  const validatorsRoot = path.join('src', 'validators');
  const targetPath = path.join(validatorsRoot, `validate${capitalizeCollectionName}.js`);

  await fs.ensureDir(validatorsRoot); // Ensure the directory exists
  await fs.writeFile(targetPath, fileContent); // Write the validator file

  console.log(`  📝 Generated validator for collection '${collectionName}': ${targetPath}`);
}