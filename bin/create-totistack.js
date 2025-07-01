#!/usr/bin/env node
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import {execa} from 'execa';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(chalk.cyan.bold('\n✨ Welcome to create-totistack! ✨\n'));

const prompts = [
  {
    type: 'input',
    name: 'projectName',
    message: 'Enter project name:',
    validate: input => input.trim() ? true : 'Project name is required'
  },
  {
    type: 'input',
    name: 'collections',
    message: 'Enter Firestore collections (comma-separated):',
    filter: input => input.split(',').map(c => c.trim()),
    validate: input => input.trim() ? true : 'At least one collection is required'
  },
  {
    type: 'confirm',
    name: 'enableAuth',
    message: 'Add Firebase Auth support?',
    default: true,
    when: answers => answers.collections.some(c => 
      ['users', 'auth', 'accounts'].includes(c.toLowerCase())
    )
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

const isAuthCollection = (collectionName) => {
  const authCollections = ['users', 'user', 'customer', 'client', 'clients', 'customers', 'student','students', 'admins', 'admin', 'accounts', 'account'];
  return authCollections.includes(collectionName.toLowerCase());
};

async function init() {
  const answers = await inquirer.prompt(prompts);
  const projectPath = path.resolve(process.cwd(), answers.projectName);
  
  try {
    // Create base project
    await createApp(answers.projectName);
    process.chdir(projectPath);
    
    // Install dependencies
    await installDependencies();
    
    // Setup Tailwind
    await setupTailwind();
    
    // Generate core structure
    //await generateStore(answers.collections);

    // Inside init() function after installing dependencies
    const authCollections = answers.collections.filter(isAuthCollection);
    let roles = [];
    let addActivityLogging = false;

    if (authCollections.length > 0 && answers.enableAuth) {
      // Get roles if role-based auth is enabled
      if (answers.enableRoles) {
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

    // Generate the store
    await generateStore({
      storeName: 'appStore',
      collections: answers.collections,
      roles,
      addActivityLogging
    });
    await generateRouter(answers);
    
    // Generate optional features
    if (answers.enableAuth) {
      await generateAuth({
      storeName: 'appStore',
      collections: answers.collections,
      roles,
      addActivityLogging
    });
    }
    if (answers.enableAdmin) {
      await generateAdmin({
      storeName: 'appStore'
    });
    }
    if (answers.enableLanding) {
      await generateLanding();
    }
    if (answers.enableLoading) {
      await generateLoading();
    }
    
    // Create environment template
    await fs.writeFile('.env.example', 
      `VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=`);
    
    // Create documentation
    await createDocumentation(answers);
    
    // Run seeder if requested
    if (answers.runSeeder) {
      await runSeeder();
    }
    
    console.log(chalk.green.bold('\n✅ Project setup completed successfully!\n'));
    console.log(chalk.yellow('Next steps:'));
    console.log(`1. cd ${answers.projectName}`);
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
${answers.collections.map(c => `- ${c}`).join('\n')}
`;
  await fs.writeFile('STORE_GUIDE.md', docContent);
}

init();