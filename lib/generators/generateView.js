// lib/generators/generateView.js
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { capitalizeFirstLetter, getProjectRoot } from '../helper/utils.js';

export async function generateView(viewName, nestedPath = '', projectPath = null) {
    projectPath = projectPath || getProjectRoot();
    if (!projectPath) {
        console.error(chalk.red('Error: Not inside a totistack project. Please run this command from your project root.'));
        process.exit(1);
    }

    const capitalizedViewName = capitalizeFirstLetter(viewName);
    const viewDirectory = path.join('src/views', nestedPath);
    const viewTargetPath = path.join(projectPath, viewDirectory, `${capitalizedViewName}View.vue`);
    const routePath = nestedPath ? `/${nestedPath.toLowerCase()}/${viewName.toLowerCase()}` : `/${viewName.toLowerCase()}`;
    const routeName = nestedPath ? `${nestedPath.toLowerCase()}-${viewName.toLowerCase()}` : viewName.toLowerCase();

    const viewContent = `
<script setup>
// import { ref } from 'vue';
</script>

<template>
  <div class="${viewName.toLowerCase()}-view">
    <h1>${capitalizedViewName} View</h1>
    <p>This is a generated Vue view. Edit me!</p>
  </div>
</template>

<style scoped>
/* Add your view-specific styles here */
</style>
    `;

    try {
        await fs.ensureDir(path.dirname(viewTargetPath));
        await fs.writeFile(viewTargetPath, viewContent.trim());
        console.log(chalk.green.bold(`✅ View '${capitalizedViewName}View.vue' generated successfully at ${viewDirectory}!`));
        console.log(chalk.yellow(`\nDon't forget to add this route to src/router/index.js:`));
        console.log(chalk.yellow(`
            {
                path: '${routePath}',
                name: '${routeName}',
                component: () => import('@/${viewDirectory}/${capitalizedViewName}View.vue'),
                // meta: { requiresAuth: true } // Add meta fields as needed
            },
        `));
    } catch (error) {
        console.error(chalk.red.bold(`❌ Error generating view '${capitalizedViewName}View.vue':`), error);
        throw error;
    }
}