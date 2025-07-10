import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk'; // Assuming chalk is available and used for logging
import { toPascalCase, toCamelCase } from './helper/helperF.js'; // Ensure these are correctly imported
 
/**
 * @typedef {Object} CollectionConfig
 * @property {string} name - The name of the Firestore collection.
 * @property {Object.<string, string>} fields - An object where keys are field names and values are their data types.
 * @property {string} [dataType='object'] - The overall data type of the documents in the collection.
 */

/**
 * Generates the Vue Router configuration file (index.js) and associated view files.
 *
 * @param {object} answers - An object containing user preferences for features and collections.
 * @param {boolean} answers.enableAuth - Whether authentication support is enabled.
 * @param {boolean} answers.enableRoles - Whether role-based authorization is enabled.
 * @param {boolean} answers.enableAuthViews - Whether authentication views (Login, Register) are enabled.
 * @param {boolean} answers.enableAdmin - Whether the admin panel is enabled.
 * @param {boolean} answers.enableLanding - Whether a landing page is enabled.
 * @param {CollectionConfig[]} answers.collections - Array of collection configurations.
 */
export default async function generateRouter(answers) {
  const { enableAuth, enableRoles, enableAuthViews, enableAdmin, enableLanding, collections } = answers;

  const routerDir = 'src/router';
  await fs.ensureDir(routerDir);

  let routes = [];

  // Helper function to generate lazy-loaded import paths for standard views
  const getStandardComponentLazyImportPath = (componentName, subDir = '') => {
    return `() => import('@/views/${subDir ? subDir + '/' : ''}${componentName}.vue')`;
  };

  // Base routes
  if (enableLanding) {
    routes.push({
      path: '/',
      name: 'Home',
      component: getStandardComponentLazyImportPath('LandingPage'),
      meta: { layout: 'GuestLayout' }
    });
  } else {
    routes.push({
      path: '/',
      name: 'Home',
      component: getStandardComponentLazyImportPath('HomeView'),
      meta: { layout: 'AppLayout', requiresAuth: true }
    });
  }

  // Auth routes
  if (enableAuth && enableAuthViews) {
    routes.push(
      {
        path: '/login',
        name: 'Login',
        component: getStandardComponentLazyImportPath('LoginView', 'auth'),
        meta: { layout: 'GuestLayout', guestOnly: true }
      },
      {
        path: '/register',
        name: 'Register',
        component: getStandardComponentLazyImportPath('RegisterView', 'auth'),
        meta: { layout: 'GuestLayout', guestOnly: true }
      },
      {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: getStandardComponentLazyImportPath('ForgotPasswordView', 'auth'),
        meta: { layout: 'GuestLayout', guestOnly: true }
      },
      {
        path: '/reset-password',
        name: 'ResetPassword',
        component: getStandardComponentLazyImportPath('ResetPasswordView', 'auth'),
        meta: { layout: 'GuestLayout', guestOnly: true }
      },
      {
        path: '/verify-email',
        name: 'VerifyEmail',
        component: getStandardComponentLazyImportPath('VerifyEmailView', 'auth'),
        meta: { layout: 'GuestLayout', guestOnly: true }
      },
      {
        path: '/unauthorized',
        name: 'Unauthorized',
        component: getStandardComponentLazyImportPath('UnauthorizedView', 'auth'),
        meta: { layout: 'GuestLayout' }
      },
      {
        path: '/account',
        name: 'Account',
        component: getStandardComponentLazyImportPath('AccountView'),
        meta: { layout: 'AppLayout', requiresAuth: true }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: getStandardComponentLazyImportPath('SettingsView'),
        meta: { layout: 'AppLayout', requiresAuth: true }
      }
    );
  }

  // Admin routes
  if (enableAdmin) {
    routes.push(
      {
        path: '/admin/dashboard',
        name: 'AdminDashboard',
        component: getStandardComponentLazyImportPath('DashboardView', 'admin'),
        meta: {
          layout: 'AdminLayout',
          requiresAuth: true,
          requiresAdmin: enableRoles
        }
      },
      {
        path: '/admin/users',
        name: 'AdminUsers',
        component: getStandardComponentLazyImportPath('UsersView', 'admin'),
        meta: {
          layout: 'AdminLayout',
          requiresAuth: true,
          requiresAdmin: enableRoles
        }
      }
    );
  }

  // NEW: Add routes for each collection's Create and Edit components
  if (collections && collections.length > 0) {
    for (const collectionConfig of collections) {
      const pascalCollectionName = toPascalCase(collectionConfig.name);
      const camelCollectionName = toCamelCase(collectionConfig.name);

      routes.push(
        {
          path: `/${camelCollectionName}/create`,
          name: `${pascalCollectionName}Create`,
          component: `() => import('@/views/${camelCollectionName}/Create.vue')`,
          meta: { layout: 'AppLayout', requiresAuth: true } // Assuming these forms require auth
        },
        {
          path: `/${camelCollectionName}/edit/:id`,
          name: `${pascalCollectionName}Edit`,
          component: `() => import('@/views/${camelCollectionName}/Edit.vue')`,
          props: true, // Pass route params as props to the component
          meta: { layout: 'AppLayout', requiresAuth: true } // Assuming these forms require auth
        }
      );
    }
  }

  // Fallback route for 404 or redirect to home
  routes.push({
    path: '/:pathMatch(.*)*',
    redirect: '/'
  });

  // Stringify processedRoutes and then replace the quoted lazy-load function string
  // with the actual function, removing the quotes added by JSON.stringify.
  // This step is crucial because JSON.stringify will quote the function string.
  const routesString = JSON.stringify(routes, null, 2)
    .replace(/"component": "(\(\) => import\('[^']+'\))"/g, '"component": $1');

  // Generate router/index.js content
  const content = `/**
 * @title Router Configuration
 * @description Vue Router setup with generated routes and loading indicator integration
 * @author Generated by create-totistack |XBEN SOMMO
 * @created ${new Date().toISOString()}
 */
import { createRouter, createWebHistory } from 'vue-router';
import { useAppStore } from '@/stores/appStore'; // Import the loading store

// Import layouts (components will be lazy-loaded)
import AppLayout from '@/layouts/AppLayout.vue';
import GuestLayout from '@/layouts/GuestLayout.vue';
${enableAdmin ? "import AdminLayout from '@/layouts/AdminLayout.vue';" : ''}

// Import navigation guards (if enabled)
${enableAuth ? "import authGuard from '@/router/guards/authGuard';" : ''}
${enableRoles ? "import roleGuard from '@/router/guards/roleGuard';" : ''}

const routes = ${routesString};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guards
router.beforeEach((to, from, next) => {
  const appStore = useAppStore(); // Get the store instance inside beforeEach
  appStore.showLoading(); // Show loading spinner
  next();
});

router.afterEach(() => {
  const appStore = useAppStore(); // Get the store instance inside afterEach
  appStore.hideLoading(); // Hide loading spinner after navigation
});

router.onError(() => {
  const appStore = useAppStore(); // Get the store instance inside onError
  appStore.hideLoading(); // Hide loading spinner if navigation fails
});

${enableAuth ? 'router.beforeEach(authGuard);' : ''}
${enableRoles ? 'router.beforeEach(roleGuard);' : ''}

export default router;`;

  const routerFilePath = path.join(routerDir, 'index.js');
  await fs.writeFile(routerFilePath, content);
  console.log(chalk.green(`  ✅ Router configuration generated at ${routerFilePath}`));

  // Create placeholder views if they don't exist
  const viewsDir = 'src/views';
  await fs.ensureDir(viewsDir);

  // HomeView or LandingPage
  if (!enableLanding) {
    const homeContent = `<!--
* @title HomeView
* @description Application home page
* @author Generated by create-totistack
* @created ${new Date().toISOString()}
-->
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">Welcome to the App</h1>
    <p class="text-lg text-gray-700">This is the main application dashboard.</p>
    <p class="mt-4 text-gray-600">Start building your features here!</p>
  </div>
</template>`;
    await fs.writeFile(path.join(viewsDir, 'HomeView.vue'), homeContent);
    console.log(`  📄 Generated ${path.join(viewsDir, 'HomeView.vue')}`);
  } else {
    const landingContent = `<!--
* @title LandingPage
* @description Application landing page
* @author Generated by create-totistack
* @created ${new Date().toISOString()}
-->
<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4">
    <h1 class="text-5xl font-extrabold mb-6 text-center leading-tight">Welcome to Your Awesome App!</h1>
    <p class="text-xl mb-8 text-center max-w-2xl">
      A powerful and modern web application built with Vue 3, Pinia, Tailwind CSS, and Firebase.
    </p>
    <div class="flex space-x-4">
      <router-link to="/login" class="px-8 py-3 bg-white text-blue-600 font-bold rounded-full shadow-lg hover:bg-gray-100 transition duration-300">
        Get Started
      </router-link>
      <router-link to="/about" class="px-8 py-3 border border-white text-white font-bold rounded-full hover:bg-white hover:text-blue-600 transition duration-300">
        Learn More
      </router-link>
    </div>
    <div class="mt-12 text-sm text-gray-200">
      &copy; ${new Date().getFullYear()} MyApp. All rights reserved.
    </div>
  </div>
</template>`;
    await fs.writeFile(path.join(viewsDir, 'LandingPage.vue'), landingContent);
    console.log(`  📄 Generated ${path.join(viewsDir, 'LandingPage.vue')}`);
  }

  // Auth views
  if (enableAuth && enableAuthViews) {
    const authViewsDir = path.join(viewsDir, 'auth');
    await fs.ensureDir(authViewsDir);

    const authViewNames = ['LoginView', 'RegisterView', 'ForgotPasswordView', 'ResetPasswordView', 'VerifyEmailView', 'UnauthorizedView'];
    for (const viewName of authViewNames) {
      const content = `<!--
* @title ${viewName}
* @description ${viewName.replace('View', ' page')}
* @author Generated by create-totistack
* @created ${new Date().toISOString()}
-->
<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">${viewName.replace('View', '')}</h1>
      <p>This is the placeholder for the ${viewName.replace('View', '')} page.</p>
      <!-- Add actual form/content here -->
    </div>
  </div>
</template>`;
      await fs.writeFile(path.join(authViewsDir, `${viewName}.vue`), content);
      console.log(`  📄 Generated ${path.join(authViewsDir, `${viewName}.vue`)}`);
    }

    // Account and Settings views (not in auth sub-directory as they are authenticated user views)
    const accountViewContent = `<!--
* @title AccountView
* @description User account settings page
* @author Generated by create-totistack
* @created ${new Date().toISOString()}
-->
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">My Account</h1>
    <div class="bg-white p-6 rounded-lg shadow">
      <p>This is your account management page. You can update your profile information here.</p>
      <!-- Add actual account management forms/components here -->
    </div>
  </div>
</template>`;
    await fs.writeFile(path.join(viewsDir, 'AccountView.vue'), accountViewContent);
    console.log(`  📄 Generated ${path.join(viewsDir, 'AccountView.vue')}`);

    const settingsViewContent = `<!--
* @title SettingsView
* @description Application settings page
* @author Generated by create-totistack
* @created ${new Date().toISOString()}
-->
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">Settings</h1>
    <div class="bg-white p-6 rounded-lg shadow">
      <p>Adjust your application settings here.</p>
      <!-- Add actual settings options here -->
    </div>
  </div>
</template>`;
    await fs.writeFile(path.join(viewsDir, 'SettingsView.vue'), settingsViewContent);
    console.log(`  📄 Generated ${path.join(viewsDir, 'SettingsView.vue')}`);
  }

  // Admin views
  if (enableAdmin) {
    const adminViewsDir = path.join(viewsDir, 'admin');
    await fs.ensureDir(adminViewsDir);

    const adminViewNames = ['DashboardView', 'UsersView'];
    for (const viewName of adminViewNames) {
      const content = `<!--
* @title ${viewName}
* @description Admin ${viewName.replace('View', ' page')}
* @author Generated by create-totistack
* @created ${new Date().toISOString()}
-->
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">Admin ${viewName.replace('View', '')}</h1>
    <div class="bg-white p-6 rounded-lg shadow">
      <p>This is the placeholder for the admin ${viewName.replace('View', '')} page.</p>
      <!-- Add admin-specific content/components here -->
    </div>
  </div>
</template>`;
      await fs.writeFile(path.join(adminViewsDir, `${viewName}.vue`), content);
      console.log(`  📄 Generated ${path.join(adminViewsDir, `${viewName}.vue`)}`);
    }
  }
}