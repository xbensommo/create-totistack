// lib/generators/generateModel.js
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { capitalizeFirstLetter, getProjectRoot } from '../helper/utils.js'; // Assume utils.js exists for helpers
import { generateStoreModule } from '../helper/generateStoreModule.js'; // New helper for individual store modules
import { generateValidator } from '../helper/generateValidator.js'; // New helper for individual validators
import { generateFormComponents } from '../helper/generateFormComponents.js'; // Reuse existing helper

/**
 * Generates a new Firestore collection model (Pinia store, validation, forms).
 * @param {Object} collectionConfig - Configuration for the new collection (e.g., { name: 'products', fields: { title: 'string' } }).
 */
export async function generateModel(collectionConfig) {
    const projectRoot = getProjectRoot(); // Function to find the project root from current directory
    if (!projectRoot) {
        console.error(chalk.red('Error: Not inside a totistack project. Please run this command from your project root.'));
        process.exit(1);
    }

    const collectionName = collectionConfig.name;
    const fields = collectionConfig.fields;

    console.log(chalk.blue(`Generating model for collection: ${collectionName}...`));

    try {
        // 1. Generate Pinia Store module for the new collection
        await generateStoreModule(collectionName, fields, projectRoot);

        // 2. Generate Zod validation schema
        await generateValidator(collectionName, fields, projectRoot);

        // 3. Generate Create/Edit Vue forms for the new collection
        await generateFormComponents([collectionConfig], projectRoot); // Pass an array for consistency

        // 4. Update router (conceptual: need to append new routes)
        // This is complex for a simple 'make' command without full router re-generation.
        // For V1, we'll simply instruct the user to manually add routes.
        console.log(chalk.yellow(`\nManually add routes for ${capitalizeFirstLetter(collectionName)} to src/router/index.js:`));
        console.log(chalk.yellow(`
            {
                path: '/${collectionName}/create',
                name: '${collectionName}-create',
                component: () => import('@/views/${collectionName}/Create.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/${collectionName}/edit/:id',
                name: '${collectionName}-edit',
                component: () => import('@/views/${collectionName}/Edit.vue'),
                props: true,
                meta: { requiresAuth: true }
            },
        `));

        // 5. Update STORE_GUIDE.md (append new collection details)
        const storeGuidePath = path.join(projectRoot, 'STORE_GUIDE.md');
        let storeGuideContent = await fs.readFile(storeGuidePath, 'utf-8');

        const newCollectionDoc = `\n\n- **${collectionName}**\n  Fields:\n${Object.entries(fields).map(([field, type]) => `    - ${field}: \`${type}\``).join('\n')}`;
        storeGuideContent += newCollectionDoc;
        await fs.writeFile(storeGuidePath, storeGuideContent);


        console.log(chalk.green.bold(`✅ Model for '${collectionName}' generated successfully!`));
    } catch (error) {
        console.error(chalk.red.bold(`❌ Error generating model for '${collectionName}':`), error);
        throw error; // Re-throw to be caught by the calling CLI
    }
}

// Add necessary helper functions if they don't exist
// lib/helper/utils.js (New or updated)
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getProjectRoot() {
    let currentPath = process.cwd();
    while (currentPath !== path.parse(currentPath).root) {
        if (fs.existsSync(path.join(currentPath, 'package.json')) &&
            fs.existsSync(path.join(currentPath, 'src')) &&
            fs.existsSync(path.join(currentPath, '.env.example'))) { // Check for a totistack indicator file
            return currentPath;
        }
        currentPath = path.dirname(currentPath);
    }
    return null;
}

// lib/helper/generateStoreModule.js (New)
// This extracts logic from generateStore.js to create a single module
export async function generateStoreModule(collectionName, fields, projectPath) {
    const storeTemplatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../templates/storeModule.js');
    const storeTargetPath = path.join(projectPath, 'src/stores', `${collectionName}Store.js`);

    const capitalizedCollectionName = capitalizeFirstLetter(collectionName);

    let storeContent = `
import { defineStore } from 'pinia';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/utils/firebase'; // Ensure your firebase.js exports 'db'

export const use${capitalizedCollectionName}Store = defineStore('${collectionName}Store', {
  state: () => ({
    ${collectionName}: null,
    ${collectionName}s: [],
    loading: false,
    error: null,
  }),

  actions: {
    async add${capitalizedCollectionName}(data) {
      this.loading = true;
      this.error = null;
      try {
        const docRef = await addDoc(collection(db, '${collectionName}'), data);
        this.loading = false;
        return docRef.id;
      } catch (error) {
        this.error = error.message;
        this.loading = false;
        throw error;
      }
    },

    async fetch${capitalizedCollectionName}s() {
      this.loading = true;
      this.error = null;
      try {
        const q = query(collection(db, '${collectionName}'));
        const querySnapshot = await getDocs(q);
        this.${collectionName}s = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.loading = false;
        return this.${collectionName}s;
      } catch (error) {
        this.error = error.message;
        this.loading = false;
        throw error;
      }
    },

    async fetch${capitalizedCollectionName}ById(id) {
      this.loading = true;
      this.error = null;
      try {
        const docRef = doc(db, '${collectionName}', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          this.${collectionName} = { id: docSnap.id, ...docSnap.data() };
        } else {
          this.${collectionName} = null;
        }
        this.loading = false;
        return this.${collectionName};
      } catch (error) {
        this.error = error.message;
        this.loading = false;
        throw error;
      }
    },

    async update${capitalizedCollectionName}(id, data) {
      this.loading = true;
      this.error = null;
      try {
        const docRef = doc(db, '${collectionName}', id);
        await updateDoc(docRef, data);
        this.loading = false;
      } catch (error) {
        this.error = error.message;
        this.loading = false;
        throw error;
      }
    },

    async delete${capitalizedCollectionName}(id) {
      this.loading = true;
      this.error = null;
      try {
        const docRef = doc(db, '${collectionName}', id);
        await deleteDoc(docRef);
        this.loading = false;
      } catch (error) {
        this.error = error.message;
        this.loading = false;
        throw error;
      }
    },
    // Add custom queries here if needed
    // async fetch${capitalizedCollectionName}sByField(fieldName, value) {
    //   this.loading = true;
    //   this.error = null;
    //   try {
    //     const q = query(collection(db, '${collectionName}'), where(fieldName, '==', value));
    //     const querySnapshot = await getDocs(q);
    //     this.${collectionName}s = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //     this.loading = false;
    //     return this.${collectionName}s;
    //   } catch (error) {
    //     this.error = error.message;
    //     this.loading = false;
    //     throw error;
    //   }
    // }
  },
});
    `;

    await fs.ensureDir(path.dirname(storeTargetPath));
    await fs.writeFile(storeTargetPath, storeContent.trim());
    console.log(chalk.green(`  Created src/stores/${collectionName}Store.js`));

    // Also update src/stores/index.js (the main appStore) to import the new store
    const appStorePath = path.join(projectPath, 'src/stores/appStore.js');
    let appStoreContent = await fs.readFile(appStorePath, 'utf-8');

    const importLine = `import { use${capitalizedCollectionName}Store } from './${collectionName}Store';\n`;
    const useStoreLine = `    use${capitalizedCollectionName}Store(),\n`;

    // Find a good place to insert, e.g., after existing imports or at the top of the store definition
    // Simple approach: insert after the last existing import or at the top if no imports
    if (appStoreContent.includes('import { defineStore } from \'pinia\';')) {
        const lastImportIndex = appStoreContent.lastIndexOf('import');
        const nextNewlineIndex = appStoreContent.indexOf('\n', lastImportIndex);
        appStoreContent = appStoreContent.slice(0, nextNewlineIndex + 1) + importLine + appStoreContent.slice(nextNewlineIndex + 1);
    } else {
        appStoreContent = importLine + appStoreContent;
    }

    // Insert into the return object of defineStore's actions or state, depends on how appStore combines
    // Assuming appStore combines other stores similar to the original generateStore
    const storesReturnRegex = /return\s*{\s*([^}]*)\s*};/s;
    const match = appStoreContent.match(storesReturnRegex);
    if (match) {
        const existingStores = match[1];
        const updatedStores = existingStores.trim() + (existingStores.trim() ? ',\n    ' : '') + `...use${capitalizedCollectionName}Store()`;
        appStoreContent = appStoreContent.replace(storesReturnRegex, `return {\n    ${updatedStores}\n    };`);
    } else {
        // Fallback or more robust parsing needed if the regex fails
        console.warn(chalk.yellow(`  Could not automatically update src/stores/appStore.js for ${collectionName}Store. Please add it manually.`));
    }

    await fs.writeFile(appStorePath, appStoreContent);
    console.log(chalk.green(`  Updated src/stores/appStore.js`));
}


// lib/helper/generateValidator.js (New)
export async function generateValidator(collectionName, fields, projectPath) {
    const validatorTargetPath = path.join(projectPath, 'src/validators', `validate${capitalizeFirstLetter(collectionName)}.js`);

    let zodSchemaFields = [];
    for (const fieldName in fields) {
        const fieldType = fields[fieldName];
        let zodType;
        switch (fieldType) {
            case 'string':
            case 'email': // Zod has specific email validator
            case 'tel':   // Treat phone as string for now
                zodType = fieldType === 'email' ? 'z.string().email()' : 'z.string()';
                break;
            case 'number':
                zodType = 'z.number()';
                break;
            case 'boolean':
                zodType = 'z.boolean()';
                break;
            case 'array':
                zodType = 'z.array(z.any())'; // Generic array, can be refined by user
                break;
            case 'object':
                zodType = 'z.object({})'; // Generic object, can be refined by user
                break;
            case 'timestamp':
                zodType = 'z.date()'; // Firestore Timestamps map well to Date objects
                break;
            default:
                zodType = 'z.any()';
        }
        zodSchemaFields.push(`${fieldName}: ${zodType}`);
    }

    const validatorContent = `
import { z } from 'zod';

export const ${collectionName}Schema = z.object({
  ${zodSchemaFields.join(',\n  ')}
});

// Optionally, define a validation function
export function validate${capitalizeFirstLetter(collectionName)}(data) {
  try {
    ${collectionName}Schema.parse(data);
    return { success: true, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { _global: [error.message] } };
  }
}
    `;
    await fs.ensureDir(path.dirname(validatorTargetPath));
    await fs.writeFile(validatorTargetPath, validatorContent.trim());
    console.log(chalk.green(`  Created src/validators/validate${capitalizeFirstLetter(collectionName)}.js`));
}