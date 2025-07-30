/**
 * @file createApp.js
 * @description This module provides utility functions to scaffold a Vue 3 + Vite project with TailwindCSS, Pinia, Vue Router, and Firebase support.
 * It also injects default setup code into the main.js file and configures aliases in vite.config.js.
 * Intended for use in the create-totistack CLI.
 */

import fs from "fs-extra";
import path from "path";
import { execa } from "execa";
import chalk from "chalk";

/**
 * Scaffolds a new Vue 3 project using Vite.
 * @param {string} projectName - The name of the new project.
 * @returns {Promise<void>}
 */
export async function createApp(projectName) {
  console.log(chalk.blue("Creating Vite project..."));
  await execa(
    "npm",
    ["create", "vite@latest", projectName, "--", "--template", "vue"],
    {
      stdio: "inherit",
    }
  );
}

/**
 * Installs necessary frontend dependencies for Totistack projects.
 * Includes Pinia (state management), Vue Router, Firebase SDK, and Tailwind CSS stack.
 * @returns {Promise<void>}
 */
export async function installDependencies() {
  console.log(chalk.blue("Installing dependencies..."));

  const dependencies = [
    "aos",
    "font-awesome",
    "pinia",
    "vue-router@4",
    "firebase",
    "@tailwindcss/vite",
    "tailwindcss",
    "swiper",
    "swiper.js",
    "path",
  ];

  await execa("npm", ["install", ...dependencies], { stdio: "inherit" });
}

/**
 * Sets up Tailwind CSS, adds alias config in vite.config.js, and modifies main.js to:
 * - import main.css
 * - import and register the router
 * - import and register Pinia
 * @returns {Promise<void>}
 */
export async function setupTailwind() {
  console.log(
    chalk.blue("Installing Tailwind CSS v4 and configuring for custom setup...")
  );

  // Create custom main.css with @theme configuration
  const cssContent = `@import "tailwindcss";

  @theme {
    --color-primary: #15803d;
  --color-primary-light: #22c55e;
  --color-primary-dark: #166534;
  --color-secondary: #facc15;
  --color-secondary-light: #fde68a;
  --color-neutral-light: #f9fafb;
  --color-neutral: #6b7280;
  --color-neutral-dark: #111827;
  --color-accent: #ecfccb;
    --fontfamily-sans: Jost, sans-serif;
    --animation-float: float 6s ease-in-out infinite; 
  --animation-spin-slow: spin 10s linear infinite;
  --keyframes-float-0%, 100%-transform: translateY(0);
  --keyframes-float-50%-transform: translateY(-20px);
  --font-sans: serif;
  --font-space: Grotesk;
  }
  `;

  const mainCssPath = path.resolve("src", "main.css");
  await fs.ensureDir(path.dirname(mainCssPath));
  await fs.writeFile(mainCssPath, cssContent);

  // Update vite.config.js to include TailwindCSS and path alias
  const viteConfigPath = "vite.config.js";
  let viteConfig = await fs.readFile(viteConfigPath, "utf8");

  if (!viteConfig.includes("@tailwindcss/vite")) {
    viteConfig = viteConfig.replace(
      "import { defineConfig } from 'vite'",
      `import { defineConfig } from 'vite';\nimport tailwindcss from '@tailwindcss/vite';\nimport path from 'path'`
    );
  }

  if (!viteConfig.includes("tailwindcss()")) {
    viteConfig = viteConfig.replace(
      /plugins:\s*\[(.*?)\]/s,
      (match, plugins) => `plugins: [${plugins.trim()}, tailwindcss()]`
    );
  }

  if (!viteConfig.includes("resolve:")) {
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

  // Modify src/main.js to import CSS, router, and Pinia
  const mainJsPath = path.resolve("src", "main.js");
  if (await fs.pathExists(mainJsPath)) {
    let mainJs = await fs.readFile(mainJsPath, "utf8");

    // Ensure main.css import is at the top
    if (!mainJs.includes(`import '@/main.css';`)) {
      mainJs = `import '@/main.css';\n` + mainJs;
    }

    // Ensure router import is present
    if (!mainJs.includes(`import router from '@/router';`)) {
      mainJs = `import router from '@/router';\n` + mainJs;
    }

    // Ensure Pinia import is present
    if (!mainJs.includes(`import { createPinia } from 'pinia';`)) {
      mainJs = `import { createPinia } from 'pinia';\n` + mainJs;
    }

    // Replace the createApp(...).mount(...) line with the full setup including Pinia and Router
    // This regex looks for createApp(App).mount('#app'); or similar variations.
    mainJs = mainJs.replace(
      /createApp\((.*?)\)\s*\.mount\((.*?)\);/s,
      `const app = createApp($1);\nconst pinia = createPinia();\napp.use(pinia);\napp.use(router);\napp.mount($2);`
    );

    await fs.writeFile(mainJsPath, mainJs);
  }

  // Modify src/App.vue to include PageSpinner
  const appVuePath = path.resolve("src", "App.vue");
  if (await fs.pathExists(appVuePath)) {
    let appVueContent = await fs.readFile(appVuePath, "utf8");

    // Add import statement for PageSpinner if not already present
    const scriptSetupRegex = /<script setup>([\s\S]*?)<\/script>/;
    if (
      scriptSetupRegex.test(appVueContent) &&
      !appVueContent.includes(
        `import PageSpinner from '@/components/PageSpinner.vue';`
      )
    ) {
      appVueContent = appVueContent.replace(
        scriptSetupRegex,
        `<script setup>\nimport PageSpinner from '@/components/PageSpinner.vue';\n$1</script>`
      );
    } else if (!scriptSetupRegex.test(appVueContent)) {
      // If no script setup block, add a new one with the import
      appVueContent = appVueContent.replace(
        "<template>",
        `<template>\n<script setup>\nimport PageSpinner from '@/components/PageSpinner.vue';\n</script>\n`
      );
    }

    // Add <PageSpinner /> to the template if not already present
    const templateRegex = /<template>([\s\S]*?)<\/template>/;
    if (
      templateRegex.test(appVueContent) &&
      !appVueContent.includes(`<PageSpinner />\n<RouterView />`)
    ) {
      appVueContent = appVueContent.replace(
        "</template>",
        ` <RouterView />\n <PageSpinner />\n</template>`
      );
    }

    await fs.writeFile(appVuePath, appVueContent);
  }
}
