#!/usr/bin/env node
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { execa } from 'execa'; // Keep execa if it's used elsewhere for commands

import {
  createApp,
  installDependencies,
  setupTailwind
} from '../lib/createApp.js';
import generateStore from '../lib/generateStore.js';
import generateAuth from '../lib/generateAuth.js';
import generateAdmin from '../lib/generateAdmin.js';
import generateLanding from '../lib/generateLanding.js';
import generateRouter from '../lib/generateRouter.js';
import generateLoading from '../lib/generateLoading.js';
import runSeeder from '../lib/runSeeder.js';
import { generateFormComponents } from '../lib/helper/generateFormComponents.js'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(chalk.cyan.bold('\n✨ Welcome to create-totistack! ✨\n'));

// Define the available field types for user selection
const FIELD_TYPES = ['string', 'number', 'boolean', 'array', 'object', 'timestamp', 'email'];

/**
 * Checks if a given collection configuration represents an authentication-related collection.
 * This function is now updated to work with the new collection object structure.
 * @param {Object} collectionConfig - The configuration object for a collection.
 * @param {string} collectionConfig.name - The name of the Firestore collection.
 * @returns {boolean} True if the collection is considered an auth collection, false otherwise.
 */
const isAuthCollection = (collectionConfig) => {
  const authCollections = ['users', 'user', 'customer', 'client', 'clients', 'customers', 'student', 'students', 'admins', 'admin', 'accounts', 'account'];
  return authCollections.includes(collectionConfig.name.toLowerCase());
};

async function init() {
  const initialAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter project name:',
      validate: input => input.trim() ? true : 'Project name is required'
    }
  ]);

  const projectPath = path.resolve(process.cwd(), initialAnswers.projectName);

  // Array to store the structured collection data
  const collectionsData = [];

  let addAnotherCollection = true;
  while (addAnotherCollection) {
    const collectionAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'collectionName',
        message: `Enter name for collection ${collectionsData.length + 1}:`,
        validate: input => input.trim() ? true : 'Collection name is required'
      }
    ]);

    const currentCollection = {
      name: collectionAnswers.collectionName,
      fields: {},
      dataType: 'object' // Default data type for the collection document
    };

    let addFields = true;
    // const fieldCount = 0; // This variable is not used, can be removed

    while (addFields) {
      // First, get the fieldName
      const fieldNameAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: `Enter field name for '${currentCollection.name}':`,
          validate: input => input.trim() ? true : 'Field name is required'
        }
      ]);

      // Then, use the obtained fieldName to prompt for the fieldType
      const fieldTypeAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'fieldType',
          // Access the fieldName from fieldNameAnswer
          message: `Select type for '${fieldNameAnswer.fieldName}':`,
          choices: FIELD_TYPES,
          default: 'string'
        }
      ]);

      // Finally, ask if they want to add another field
      const addAnotherFieldAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnotherField',
          message: 'Add another field to this collection?',
          default: true
        }
      ]);

      // Now, combine the answers
      const fieldAnswers = {
        fieldName: fieldNameAnswer.fieldName,
        fieldType: fieldTypeAnswer.fieldType,
        addAnotherField: addAnotherFieldAnswer.addAnotherField
      };

      currentCollection.fields[fieldAnswers.fieldName] = fieldAnswers.fieldType;
      addFields = fieldAnswers.addAnotherField;
    }

    collectionsData.push(currentCollection);

    const continueCollections = await inquirer.prompt({
      type: 'confirm',
      name: 'addAnotherCollection',
      message: 'Add another collection?',
      default: true
    });
    addAnotherCollection = continueCollections.addAnotherCollection;
  }

  // Now, prompt for other features, using the collected collectionsData
  const featurePrompts = [
    {
      type: 'confirm',
      name: 'enableAuth',
      message: 'Add Firebase Auth support?',
      default: true,
      // Check if any of the collected collections are auth-related
      when: () => collectionsData.some(isAuthCollection)
    },
    {
      type: 'confirm',
      name: 'enableRoles',
      message: 'Add role-based authorization?',
      default: false,
      when: answers => answers.enableAuth
    },
    {
      type: 'confirm',
      name: 'enableAuthViews',
      message: 'Add authentication views (Login, Register, etc)?',
      default: true,
      when: answers => answers.enableAuth
    },
    {
      type: 'confirm',
      name: 'enableAdmin',
      message: 'Add admin panel scaffold?',
      default: false
    },
    {
      type: 'confirm',
      name: 'enableLanding',
      message: 'Add landing page?',
      default: true
    },
    {
      type: 'confirm',
      name: 'enableLoading',
      message: 'Add global loading UI?',
      default: true
    },
    {
      type: 'confirm',
      name: 'runSeeder',
      message: 'Run Firestore seeder after setup?',
      default: false
    }
  ];

  const featureAnswers = await inquirer.prompt(featurePrompts);

  // Combine initial answers and feature answers
  const allAnswers = { ...initialAnswers, ...featureAnswers, collections: collectionsData };

  try {
    // Create base project
    await createApp(allAnswers.projectName);
    process.chdir(projectPath);

    // Install dependencies
    await installDependencies();

    // Setup Tailwind
    await setupTailwind();

    let roles = [];
    let addActivityLogging = false;

    // Determine roles and activity logging based on collected data and answers
    if (allAnswers.collections.some(isAuthCollection) && allAnswers.enableAuth) {
      // Get roles if role-based auth is enabled
      if (allAnswers.enableRoles) {
        roles = (await inquirer.prompt({
          type: 'input',
          name: 'roles',
          message: 'Enter roles for authorization (comma-separated):',
          default: 'admin,user'
        })).roles.split(',').map(r => r.trim());
      }

      // Ask about activity logging
      addActivityLogging = (await inquirer.prompt({
        type: 'confirm',
        name: 'addActivityLogging',
        message: 'Add activity logging system?',
        default: false
      })).addActivityLogging;
    }

    // Generate the store with the structured collections data
    await generateStore({ 
      storeName: 'appStore',
      collections: allAnswers.collections, // Pass the structured data
      roles,
      addActivityLogging
    });

    // Generate Vue form components for each collection
    await generateFormComponents(allAnswers.collections);

    // Generate router, passing all answers including the structured collections
    await generateRouter(allAnswers);

    // Generate optional features
    if (allAnswers.enableAuth) {
      await generateAuth(allAnswers);
    }
    if (allAnswers.enableAdmin) {
      await generateAdmin(allAnswers);
    }
    if (allAnswers.enableLanding) {
      await generateLanding();
    }
    if (allAnswers.enableLoading) {
      await generateLoading(allAnswers);
    }

    // Create environment template
    await fs.writeFile('.env.example',
      `VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=`
    );

    // Create documentation
    await createDocumentation(allAnswers);

    // Run seeder if requested
    if (allAnswers.runSeeder) {
      await runSeeder();
    }

    console.log(chalk.green.bold('\n✅ Project setup completed successfully!\n'));
    console.log(chalk.yellow('Next steps:'));
    console.log(`1. cd ${allAnswers.projectName}`);
    console.log('2. Create a .env file with your Firebase credentials');
    console.log('3. npm run dev');

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error during setup:'), error);
    process.exit(1);
  }
}

async function createDocumentation(answers) {
  const docContent = `# ${answers.projectName} - Totistack Project

## Project Structure
- Stores: Pinia stores for Firestore collections
- Views: Page components organized by feature
- Layouts: Wrapper components for different page types
- Utils: Firebase initialization and helpers
- Validators: Modules for data validation

## Available Scripts
- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run serve\`: Preview production build

## Configuration
1. Create a .env file based on .env.example
2. Add your Firebase configuration details

## Features Included
${answers.enableAuth ? '- Authentication system\n' : ''}\
${answers.enableAdmin ? '- Admin panel\n' : ''}\
${answers.enableLanding ? '- Landing page\n' : ''}\
${answers.enableLoading ? '- Global loading indicators\n' : ''}

## Generated Collections
${answers.collections.map(c => `- **${c.name}**\n  Fields:\n${Object.entries(c.fields).map(([field, type]) => `    - ${field}: \`${type}\``).join('\n')}`).join('\n\n')}
`;
  await fs.writeFile('STORE_GUIDE.md', docContent);
}

init();