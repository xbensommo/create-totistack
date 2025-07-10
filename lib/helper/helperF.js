import fs from 'fs';
import path from 'path';

/**
 * Converts kebab-case to camelCase
 * @param {string} str - Input string in kebab-case
 * @returns {string} camelCase version of input
 */
export const toCamel = (str) => str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Converts a string to camelCase (e.g., "hello world" -> "helloWorld").
 * Handles kebab-case, snake_case, and space-separated strings.
 * @param {string} str - The input string.
 * @returns {string} The camelCase version of the string.
 */
export const toCamelCase = (str) => str.trim().toLowerCase().split(/[-\s_]+/).map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');

/**
 * Capitalizes the first letter of a string
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Writes content to a file with consistent formatting
 * @param {string} filePath - Full file path
 * @param {string} content - File content
 * @throws {Error} If file writing fails
 */
export const writeFile = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content.trim() + '\n');
  } catch (error) {
    throw new Error(`Failed to write file: ${filePath}\n${error.message}`);
  }
};

/**
 * Converts a string to PascalCase (e.g., "hello world" -> "HelloWorld").
 * Handles kebab-case, snake_case, and space-separated strings.
 * @param {string} str - The input string.
 * @returns {string} The PascalCase version of the string.
 */
export const toPascalCase = (str) => str.trim().toLowerCase().split(/[-\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');