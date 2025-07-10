import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Generates authentication-related files for a Vue.js application,
 * including router guards, authentication views (login, register, etc.),
 * and basic layouts.
 *
 * @param {object} answers - An object containing user preferences.
 * @param {string} [answers.appStore='appStore'] - The name of the authentication store file (e.g., 'authStore').
 * @param {boolean} [answers.enableRoles=false] - Whether to generate a role-based guard.
 * @param {boolean} [answers.enableAuthViews=true] - Whether to generate authentication view components.
 */
export default async function generateAuth(answers) {
  const { appStore = 'appStore', enableRoles, enableAuthViews } = answers;
  // Construct the path to the auth store, assuming it's in '@/stores/'
  const authStorePath = `@/stores/${appStore}`;

  // Create router guards directory
  const guardDir = 'src/router/guards';
  await fs.ensureDir(guardDir);
  console.log(chalk.blue('Generating Auth pages...'));

  // Generate authGuard.js
  await fs.writeFile(path.join(guardDir, 'authGuard.js'), `import { useAppStore } from '${authStorePath}';

export default (to, from, next) => {
  const authStore = useAppStore();
  // Redirect to login if a route requires authentication and user is not logged in
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login');
  }
  // Redirect to homepage if a guest-only route is accessed by a logged-in user
  else if (to.meta.guestOnly && authStore.user) {
    next('/');
  }
  // Proceed to the route
  else {
    next();
  }
};`);

  // Generate roleGuard.js if enableRoles is true
  if (enableRoles) {
    await fs.writeFile(path.join(guardDir, 'roleGuard.js'), `import { useAppStore } from '${authStorePath}';

export default (to, from, next) => {
  const authStore = useAppStore();
  // Redirect to unauthorized page if a route requires admin and user is not admin
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    next('/unauthorized');
  }
  // Proceed to the route
  else {
    next();
  }
};`);
  }

  // If auth views are not enabled, stop here
  if (!enableAuthViews) return;

  // Define authentication views and their properties
  const views = [
    {
      name: 'LoginView',
      title: 'Login to Totisoft CC', // Updated title
      fields: ['email', 'password'],
      action: 'login',
      extras: ['remember', 'forgot'] // 'remember me' checkbox, 'forgot password' link
    },
    {
      name: 'RegisterView',
      title: 'Sign up for Totisoft CC', // Updated title
      fields: ['name', 'email', 'password', 'confirmPassword'],
      action: 'register',
      extras: ['terms'] // 'agree to terms' checkbox
    },
    {
      name: 'ForgotPasswordView',
      title: 'Reset Password',
      fields: ['email'],
      action: 'forgotPassword'
    },
    {
      name: 'ResetPasswordView',
      title: 'New Password',
      fields: ['newPassword', 'confirmPassword'],
      action: 'resetPassword'
    },
    {
      name: 'VerifyEmailView',
      title: 'Verify Email',
      fields: [],
      action: 'verifyEmail'
    },
    {
      name: 'UnauthorizedView',
      title: 'Unauthorized',
      fields: [],
      action: null // No specific action for this view
    }
  ];

  // Create authentication views directory
  const authViewsDir = 'src/views/auth';
  await fs.ensureDir(authViewsDir);

  // Social providers configuration for login/register views
  const socialProviders = [
    { name: 'Google', icon: 'i-mdi-google', color: 'bg-red-600 hover:bg-red-700' }, // Slightly darker hover
    { name: 'Facebook', icon: 'i-mdi-facebook', color: 'bg-blue-700 hover:bg-blue-800' }, // Slightly darker hover
    { name: 'Twitter', icon: 'i-mdi-twitter', color: 'bg-sky-500 hover:bg-sky-600' } // Slightly darker hover
  ];

  // Iterate through each view to generate its .vue file
  for (const view of views) {
    let template = '';
    let scriptSetup = '';

    // Generate common form input elements based on view fields
    let inputs = view.fields.map(field => {
      const isPassword = field.includes('password');
      // Format label for display (e.g., 'confirmPassword' -> 'Confirm Password')
      const label = field === 'confirmPassword' ? 'Confirm Password' : field.replace(/([A-Z])/g, ' $1');
      const type = isPassword ? 'password' : field === 'email' ? 'email' : 'text';

      return `
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-1 capitalize">${label}</label>
        <input
          v-model="${field}"
          type="${type}"
          required
          :placeholder="isPassword ? '••••••••' : 'Enter your ' "
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out" />
      </div>`;
    }).join('');

    // Generate extra elements (remember me, forgot password, terms)
    let extras = '';
    if (view.extras?.includes('remember')) {
      extras += `
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center">
          <input id="remember" type="checkbox" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
          <label for="remember" class="ml-2 text-sm text-gray-700">Remember me</label>
        </div>
        <router-link to="/forgot-password" class="text-sm text-blue-600 hover:underline">Forgot password?</router-link>
      </div>`;
    }

    if (view.extras?.includes('forgot')) {
      extras += `
      <div class="text-right mb-6">
        <router-link to="/forgot-password" class="text-sm text-blue-600 hover:underline">Forgot your password?</router-link>
      </div>`;
    }

    if (view.extras?.includes('terms')) {
      extras += `
      <div class="flex items-center mb-6">
        <input id="terms" type="checkbox" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
        <label for="terms" class="ml-2 text-sm text-gray-700">
          I agree to the <a href="#" class="text-blue-600 hover:underline">Terms & Conditions</a>
        </label>
      </div>`;
    }

    // Generate social login section for Login and Register views
    let socialLogin = '';
    if (['LoginView', 'RegisterView'].includes(view.name)) {
      socialLogin = `
      <div class="relative my-8">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-200"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        ${socialProviders.map(provider => `
        <button type="button" @click="authStore.loginWithProvider('${provider.name.toLowerCase()}')"
          class="${provider.color} text-white py-2.5 px-4 rounded-lg flex justify-center items-center transition duration-200 ease-in-out shadow-md hover:shadow-lg">
          <span class="${provider.icon} text-xl"></span>
        </button>`).join('')}
      </div>`;
    }

    // Generate action button (e.g., Login, Register)
    let buttonAction = view.action ? `
      <button type="submit"
        :disabled="authStore.loading"
        class="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 ease-in-out
               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg">
        ${view.title}
      </button>` : '';

    // Generate footer links (e.g., "Don't have an account?", "Already have an account?")
    let footerLinks = '';
    if (view.name === 'LoginView') {
      footerLinks = `
      <div class="text-center mt-8 text-sm text-gray-600">
        Don't have an account?
        <router-link to="/register" class="font-medium text-blue-600 hover:underline ml-1">Sign up</router-link>
      </div>`;
    } else if (view.name === 'RegisterView') {
      footerLinks = `
      <div class="text-center mt-8 text-sm text-gray-600">
        Already have an account?
        <router-link to="/login" class="font-medium text-blue-600 hover:underline ml-1">Sign in</router-link>
      </div>`;
    } else if (view.name === 'ForgotPasswordView') {
      footerLinks = `
      <div class="text-center mt-8 text-sm text-gray-600">
        Remember your password?
        <router-link to="/login" class="font-medium text-blue-600 hover:underline ml-1">Sign in</router-link>
      </div>`;
    }

    // Generate <script setup> content for views with an action
    if (view.action) {
      scriptSetup = `import { ref } from 'vue';
import { useAppStore } from '${authStorePath}';
import Skeleton from '@/components/Skeleton.vue'; // Assuming Skeleton component exists in this path

const authStore = useAppStore();
${view.fields.map(f => `const ${f} = ref('');`).join('\n')}

const handle${view.action.charAt(0).toUpperCase() + view.action.slice(1)} = async () => {
  try {
    await authStore.${view.action}({
      ${view.fields.map(f => `${f}: ${f}.value`).join(',\n      ')}
    });
  } catch (err) {
    console.error('${view.title} failed:', err);
  }
};`;
    }

    // Generate the main template structure for each view
    template = `
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6">
    <div class="w-full max-w-md">
      <div class="text-center mb-10">
        <router-link to="/">
          <div class="mx-auto h-12 w-auto px-4 py-2 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-semibold mb-4 shadow-md">
            Totisoft CC
          </div>
        </router-link>
        <h2 class="text-3xl font-extrabold text-gray-900">${view.title}</h2>
        ${view.name === 'UnauthorizedView' ? `
        <p class="mt-4 text-gray-600">
          You don't have permission to access this page
        </p>` : ''}
      </div>

      <div class="bg-white px-8 py-10 rounded-xl shadow-lg border border-gray-100">
        <Skeleton v-if="authStore.loading" class="h-64" />
        <template v-else>
          ${view.action ? `
          <form @submit.prevent="handle${view.action.charAt(0).toUpperCase() + view.action.slice(1)}">
            ${inputs}
            ${extras}
            ${buttonAction}
          </form>
          ${socialLogin}
          ${footerLinks}` :
          `
          <div class="text-center py-10">
            <span class="i-mdi-shield-account text-6xl text-gray-400 mx-auto block mb-4"></span>
            <p class="mt-6 text-gray-600 text-lg">
              You need special permissions to access this page
            </p>
            <router-link to="/"
              class="mt-8 inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 ease-in-out shadow-md hover:shadow-lg">
              Go to homepage
            </router-link>
          </div>
          `}
        </template>
      </div>
    </div>
  </div>
</template>`;

    // Combine script setup and template into the final .vue file content
    const fileContent = `<!-- ${view.title} Page -->
<script setup>
${scriptSetup}
</script>

${template}`;

    // Write the .vue file
    await fs.writeFile(path.join(authViewsDir, `${view.name}.vue`), fileContent);
  }

  // Create layouts directory
  const layoutsDir = 'src/layouts';
  await fs.ensureDir(layoutsDir);

  // Generate AppLayout.vue (main authenticated layout)
  await fs.writeFile(path.join(layoutsDir, 'AppLayout.vue'), `<script setup>
import { useAppStore } from '${authStorePath}';
const authStore = useAppStore();
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
    <header class="bg-white shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <router-link to="/" class="flex items-center">
            <div class="h-8 w-auto px-3 py-1 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-semibold mr-3 shadow-sm">
              Totisoft CC
            </div>
            <span class="text-xl font-bold text-gray-900">Totisoft CC</span>
          </router-link>

          <nav class="flex items-center space-x-6">
            <template v-if="authStore.user">
              <div class="relative group">
                <button class="flex items-center focus:outline-none py-2 px-3 rounded-lg hover:bg-gray-100 transition duration-200 ease-in-out">
                  <span class="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8 flex items-center justify-center text-gray-600">
                    <span class="i-mdi-account-circle text-xl"></span>
                  </span>
                  <span class="ml-2 text-sm font-medium text-gray-700">{{ authStore.user.name || authStore.user.email }}</span>
                  <span class="i-mdi-chevron-down ml-1 text-gray-500"></span>
                </button>

                <div class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 opacity-0 invisible
                             group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 border border-gray-100">
                  <router-link to="/account"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <span class="i-mdi-account-outline mr-2"></span> My Account
                  </router-link>
                  <router-link to="/settings"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <span class="i-mdi-cog-outline mr-2"></span> Settings
                  </router-link>
                  <button @click="authStore.logout"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center border-t border-gray-100 mt-1 pt-2">
                    <span class="i-mdi-logout mr-2"></span> Sign out
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <router-link to="/login"
                class="text-sm font-medium text-gray-700 hover:text-blue-600 transition duration-200 ease-in-out">
                Sign in
              </router-link>
              <router-link to="/register"
                class="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 ease-in-out shadow-md hover:shadow-lg">
                Create account
              </router-link>
            </template>
          </nav>
        </div>
      </div>
    </header>

    <main class="flex-grow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-view />
      </div>
    </main>

    <footer class="bg-white border-t border-gray-100 mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p class="text-center text-sm text-gray-500">
          &copy; ${new Date().getFullYear()} Totisoft CC. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>`);

  // Generate GuestLayout.vue (layout for unauthenticated pages)
  await fs.writeFile(path.join(layoutsDir, 'GuestLayout.vue'), `<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans antialiased">
    <router-view />
  </div>
</template>`);
}
