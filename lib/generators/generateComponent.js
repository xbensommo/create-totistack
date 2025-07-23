// lib/generators/generateComponent.js
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { capitalizeFirstLetter, getProjectRoot } from '../helper/utils.js';

export async function generateComponent(componentName, isGlobal = false, projectPath = null) {
    projectPath = projectPath || getProjectRoot();
    if (!projectPath) {
        console.error(chalk.red('Error: Not inside a totistack project. Please run this command from your project root.'));
        process.exit(1);
    }

    const capitalizedComponentName = capitalizeFirstLetter(componentName);
    const componentDir = isGlobal ? 'src/components/global' : 'src/components';
    const componentTargetPath = path.join(projectPath, componentDir, `${capitalizedComponentName}.vue`);

    const componentContent = `
<script setup>
// import { ref } from 'vue';
// const props = defineProps({
//   msg: String,
// });
</script>

<template>
  <div class="${componentName.toLowerCase()}-component">
    <h2>${capitalizedComponentName} Component</h2>
    <p>This is a generated Vue component.</p>
  </div>
</template>

<style scoped>
/* Add your component-specific styles here */
</style>
    `;

    try {
        await fs.ensureDir(path.dirname(componentTargetPath));
        await fs.writeFile(componentTargetPath, componentContent.trim());
        console.log(chalk.green.bold(`✅ Component '${capitalizedComponentName}.vue' generated successfully at ${componentDir}!`));
    } catch (error) {
        console.error(chalk.red.bold(`❌ Error generating component '${capitalizedComponentName}.vue':`), error);
        throw error;
    }
}