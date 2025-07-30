// lib/generators/generateAuthGuard.js
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { capitalizeFirstLetter, getProjectRoot } from '../helper/utils.js';

/**
 * Generates a new authentication guard file.
 * @param {string} guardName - The name of the guard (e.g., 'admin', 'permission').
 * @param {string|null} projectPath - The root path of the totistack project. If null, it will be determined.
 */
export async function generateAuthGuard(guardName, projectPath = null) {
    projectPath = projectPath || getProjectRoot();
    if (!projectPath) {
        console.error(chalk.red('Error: Not inside a totistack project. Please run this command from your project root.'));
        process.exit(1);
    }

    const capitalizedGuardName = capitalizeFirstLetter(guardName);
    const guardTargetPath = path.join(projectPath, 'src/router/guards', `${guardName}Guard.js`);

    if (await fs.pathExists(guardTargetPath)) {
        console.warn(chalk.yellow(`🟡 Warning: Auth Guard '${guardName}Guard.js' already exists. Skipping generation.`));
        return;
    }

    const guardContent = `
// src/router/guards/${guardName}Guard.js
import { useAppStore } from '@/stores/appStore'; // Assuming appStore exists if auth is enabled

/**
 * Custom guard: ensures user meets specific criteria for the route.
 * You can customize the logic within this function.
 * @param {Object} to - The target route object being navigated to.
 * @param {Object} from - The current route object being navigated away from.
 * @param {Function} next - A function that must be called to resolve the hook.
 * - next(): Move to the next hook in the pipeline or to the route itself.
 * - next(false): Abort the current navigation.
 * - next('/') or next({ path: '/' }): Redirect to a different location.
 * - next(error): Abort the current navigation and pass an error to router.onError().
 */
export async function ${guardName}Guard(to, from, next) {
    const appStore = useAppStore();

    // Example 1: Basic authentication check
    // If the user is not authenticated, redirect them to the login page.
    if (!appStore.isAuthenticated) {
        console.warn(chalk.yellow('🔒 Navigation blocked: User not authenticated.'));
        next({ name: 'login' }); // Assuming a 'login' route name
        return;
    }

    // Example 2: Role-based authorization check
    // If your route meta requires a specific role (e.g., meta: { requiresRole: 'admin' })
    // and the current user doesn't have that role, redirect to an unauthorized page.
    if (to.meta.requiresRole && (!appStore.currentUser || !appStore.currentUser.roles.includes(to.meta.requiresRole))) {
        console.warn(chalk.yellow(\`⛔ Navigation blocked: User does not have '\${to.meta.requiresRole}' role.\`));
        next({ name: 'unauthorized' }); // Assuming an 'unauthorized' route name
        return;
    }

    // Example 3: Permission-based authorization check
    // If your route meta requires a specific permission (e.g., meta: { requiresPermission: 'manage_products' })
    // and the current user doesn't have that permission.
    // This assumes your user object has a 'permissions' array.
    // if (to.meta.requiresPermission && (!appStore.currentUser || !appStore.currentUser.permissions.includes(to.meta.requiresPermission))) {
    //     console.warn(chalk.yellow(\`⛔ Navigation blocked: User does not have '\${to.meta.requiresPermission}' permission.\`));
    //     next({ name: 'unauthorized' });
    //     return;
    // }

    // If all checks pass, allow navigation to proceed.
    next();
}

/*
// How to use in src/router/index.js:

import { ${guardName}Guard } from './guards/${guardName}Guard';
// ... other imports ...

const routes = [
    // ... other routes ...
    {
        path: '/some-protected-path',
        name: 'some-protected-path',
        component: () => import('@/views/SomeProtectedView.vue'),
        meta: {
            requiresAuth: true, // You might still use this for a general auth check
            requiresRole: 'admin', // Example: this route requires the 'admin' role
            // You can add this guard to the route's beforeEnter array:
            beforeEnter: [${guardName}Guard]
        }
    },
    // Example of using multiple guards:
    // {
    //     path: '/another-protected-path',
    //     name: 'another-protected-path',
    //     component: () => import('@/views/AnotherProtectedView.vue'),
    //     meta: {
    //         requiresAuth: true,
    //         beforeEnter: [
    //             authGuard, // Assuming you have a general authGuard
    //             ${guardName}Guard // Your newly generated specific guard
    //         ]
    //     }
    // }
];

// Or, if you want to apply it globally (less common for custom guards, but possible):
// router.beforeEach(async (to, from, next) => {
//     await ${guardName}Guard(to, from, next);
// });
*/
    `;

    try {
        await fs.ensureDir(path.dirname(guardTargetPath));
        await fs.writeFile(guardTargetPath, guardContent.trim());
        console.log(chalk.green.bold(`✅ Auth Guard '${guardName}Guard.js' generated successfully at src/router/guards!`));
        console.log(chalk.yellow(`\nRemember to integrate '${guardName}Guard' into your router configuration (src/router/index.js) where needed.`));
        console.log(chalk.yellow(`Customize the logic within 'src/router/guards/${guardName}Guard.js' to define your specific authorization rules.`));
    } catch (error) {
        console.error(chalk.red.bold(`❌ Error generating Auth Guard '${guardName}Guard.js':`), error.message);
        process.exit(1);
    }
}