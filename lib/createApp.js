/**
 * @file createApp.js
 * @description This module provides utility functions to scaffold a Vue 3 + Vite project with TailwindCSS, Pinia, Vue Router, and Firebase support.
 * It also injects default setup code into the main.js file and configures aliases in vite.config.js.
 * Intended for use in the create-totistack CLI.
 */

import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import chalk from 'chalk';

/**
 * Scaffolds a new Vue 3 project using Vite.
 * @param {string} projectName - The name of the new project.
 * @returns {Promise<void>}
 */
export async function createApp(projectName) {
  console.log(chalk.blue('Creating Vite project...'));
  await execa('npm', ['create', 'vite@latest', projectName, '--', '--template', 'vue'], {
    stdio: 'inherit',
  });
}

/**
 * Installs necessary frontend dependencies for Totistack projects.
 * Includes Pinia (state management), Vue Router, Firebase SDK, and Tailwind CSS stack.
 * @returns {Promise<void>}
 */
export async function installDependencies() {
  console.log(chalk.blue('Installing dependencies...'));

  const dependencies = [
    'pinia',
    'vue-router@4',
    'firebase',
    '@tailwindcss/vite',
    'tailwindcss',
    'postcss',
    'path',
    'autoprefixer',
  ];

  await execa('npm', ['install', ...dependencies], { stdio: 'inherit' });
}

/**
 * Sets up Tailwind CSS, adds alias config in vite.config.js, and modifies main.js to:
 * - import main.css
 * - import and register the router
 * - import and register Pinia and the application store (`appStore`)
 * @returns {Promise<void>}
 */
export async function setupTailwind() {
  console.log(chalk.blue('Installing Tailwind CSS v4 and configuring for custom setup...'));

  // Create custom main.css with @theme configuration
  const cssContent = `@import "tailwindcss";

@theme {
  --color-primary: #1a1a1a;
  --color-secondary: #f5f5f5;
  --color-accent: #d4a373;
  --fontfamily-sans: Jost, sans-serif;
}
`;

  const mainCssPath = path.resolve('src', 'main.css');
  await fs.ensureDir(path.dirname(mainCssPath));
  await fs.writeFile(mainCssPath, cssContent);

  // Update vite.config.js to include TailwindCSS and path alias
  const viteConfigPath = 'vite.config.js';
  let viteConfig = await fs.readFile(viteConfigPath, 'utf8');

  if (!viteConfig.includes('@tailwindcss/vite')) {
    viteConfig = viteConfig.replace(
      "import { defineConfig } from 'vite'",
      `import { defineConfig } from 'vite';\nimport tailwindcss from '@tailwindcss/vite';\nimport path from 'path'`
    );
  }

  if (!viteConfig.includes('tailwindcss()')) {
    viteConfig = viteConfig.replace(
      /plugins:\s*\[(.*?)\]/s,
      (match, plugins) => `plugins: [${plugins.trim()}, tailwindcss()]`
    );
  }

  if (!viteConfig.includes('resolve:')) {
    viteConfig = viteConfig.replace(
      /export default defineConfig\(\{([\s\S]*?)\n\}\)/,
      (match, configContent) => {
        return `export default defineConfig({${configContent}
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    }\n})`;
      }
    );
  }

  await fs.writeFile(viteConfigPath, viteConfig);

  // Modify src/main.js to import CSS, router, store
  const mainJsPath = path.resolve('src', 'main.js');
  if (await fs.pathExists(mainJsPath)) {
    let mainJs = await fs.readFile(mainJsPath, 'utf8');

    // Inject main.css import
    if (!mainJs.includes(`@/main.css`)) {
      mainJs = `import '@/main.css';\n` + mainJs;
    }

    // Inject router
    if (!mainJs.includes(`@/router`)) {
      mainJs = `import router from '@/router';\n` + mainJs;
    }

    // Inject Pinia and appStore
    if (!mainJs.includes(`@/stores/appStore`)) {
      mainJs = `import { createPinia } from 'pinia';\nimport appStore from '@/stores/appStore';\n` + mainJs;
    }

    // Register plugins on app instance
    mainJs = mainJs.replace(
      /createApp\((.*?)\)\.mount\((.*?)\);/,
      `const app = createApp($1);\napp.use(createPinia());\napp.use(router);\napp.use(appStore);\napp.mount($2);`
    );

    await fs.writeFile(mainJsPath, mainJs);
  }

  console.log(chalk.green('✅ Tailwind CSS and application setup updated! Router and store imported in main.js.'));
}
