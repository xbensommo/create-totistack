import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export default async function generateAuth(answers) {
  const { appStore = 'appStore', enableRoles, enableAuthViews } = answers;
  const authStorePath = `@/stores/${appStore}`;

  // Create router guards
  const guardDir = 'src/router/guards';
  await fs.ensureDir(guardDir);
  console.log(chalk.blue('Generating Auth pages...'));

  await fs.writeFile(path.join(guardDir, 'authGuard.js'), `import { useAuthStore } from '${authStorePath}';

export default (to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login');
  } else if (to.meta.guestOnly && authStore.user) {
    next('/');
  } else {
    next();
  }
};`);

  if (enableRoles) {
    await fs.writeFile(path.join(guardDir, 'roleGuard.js'), `import { useAuthStore } from '${authStorePath}';

export default (to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    next('/unauthorized');
  } else {
    next();
  }
};`);
  }

  if (!enableAuthViews) return;

  const views = [
    { 
      name: 'LoginView', 
      title: 'Login', 
      fields: ['email', 'password'], 
      action: 'login',
      extras: ['remember', 'forgot']
    },
    { 
      name: 'RegisterView', 
      title: 'Create Account', 
      fields: ['name', 'email', 'password', 'confirmPassword'], 
      action: 'register',
      extras: ['terms']
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
      action: null 
    }
  ];

  const authViewsDir = 'src/views/auth';
  await fs.ensureDir(authViewsDir);

  // Social providers configuration
  const socialProviders = [
    { name: 'Google', icon: 'i-mdi-google', color: 'bg-red-500 hover:bg-red-600' },
    { name: 'Facebook', icon: 'i-mdi-facebook', color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Twitter', icon: 'i-mdi-twitter', color: 'bg-sky-400 hover:bg-sky-500' }
  ];

  for (const view of views) {
    let template = '';
    let scriptSetup = '';
    
    // Common form elements
    let inputs = view.fields.map(field => {
      const isPassword = field.includes('password');
      const label = field === 'confirmPassword' ? 'Confirm Password' : field.replace(/([A-Z])/g, ' $1');
      const type = isPassword ? 'password' : field === 'email' ? 'email' : 'text';
      
      return `
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-1 capitalize">${label}</label>
        <input 
          v-model="${field}"
          type="${type}"
          required
          :placeholder="${isPassword ? "'••••••••'" : "'Enter your ' + '${label.toLowerCase()}'"}"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition" />
      </div>`;
    }).join('');

    // Extras
    let extras = '';
    if (view.extras?.includes('remember')) {
      extras += `
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center">
          <input id="remember" type="checkbox" class="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded">
          <label for="remember" class="ml-2 text-sm text-gray-700">Remember me</label>
        </div>
        <router-link to="/forgot-password" class="text-sm text-primary hover:underline">Forgot password?</router-link>
      </div>`;
    }

    if (view.extras?.includes('forgot')) {
      extras += `
      <div class="text-right mb-6">
        <router-link to="/forgot-password" class="text-sm text-primary hover:underline">Forgot your password?</router-link>
      </div>`;
    }

    if (view.extras?.includes('terms')) {
      extras += `
      <div class="flex items-center mb-6">
        <input id="terms" type="checkbox" class="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded">
        <label for="terms" class="ml-2 text-sm text-gray-700">
          I agree to the <a href="#" class="text-primary hover:underline">Terms & Conditions</a>
        </label>
      </div>`;
    }

    // Social login
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
          class="${provider.color} text-white py-2.5 px-4 rounded-lg flex justify-center items-center transition">
          <span class="${provider.icon} text-xl"></span>
        </button>`).join('')}
      </div>`;
    }

    // Action button
    let buttonAction = view.action ? `
      <button type="submit"
        :disabled="authStore.loading"
        class="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition
               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-70">
        ${view.title}
      </button>` : '';

    // Footer links
    let footerLinks = '';
    if (view.name === 'LoginView') {
      footerLinks = `
      <div class="text-center mt-8 text-sm text-gray-600">
        Don't have an account? 
        <router-link to="/register" class="font-medium text-primary hover:underline ml-1">Sign up</router-link>
      </div>`;
    } else if (view.name === 'RegisterView') {
      footerLinks = `
      <div class="text-center mt-8 text-sm text-gray-600">
        Already have an account? 
        <router-link to="/login" class="font-medium text-primary hover:underline ml-1">Sign in</router-link>
      </div>`;
    } else if (view.name === 'ForgotPasswordView') {
      footerLinks = `
      <div class="text-center mt-8 text-sm text-gray-600">
        Remember your password? 
        <router-link to="/login" class="font-medium text-primary hover:underline ml-1">Sign in</router-link>
      </div>`;
    }

    // Script setup
    if (view.action) {
      scriptSetup = `import { ref } from 'vue';
import { useAuthStore } from '@/stores/${authStorePath}';
import Skeleton from '@/components/ui/Skeleton';

const authStore = useAuthStore();
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

    // Template
    template = `
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6">
    <div class="w-full max-w-md">
      <div class="text-center mb-10">
        <router-link to="/">
          <div class="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white mb-4">
            <span class="i-mdi-account text-2xl"></span>
          </div>
        </router-link>
        <h2 class="text-2xl font-bold text-gray-900">${view.title}</h2>
        ${view.name === 'UnauthorizedView' ? `
        <p class="mt-4 text-gray-600">
          You don't have permission to access this page
        </p>` : ''}
      </div>
      
      <div class="bg-white px-8 py-10 rounded-xl shadow-sm border border-gray-100">
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
            <span class="i-mdi-shield-account text-5xl text-gray-400 mx-auto"></span>
            <p class="mt-6 text-gray-600">
              You need special permissions to access this page
            </p>
            <router-link to="/" 
              class="mt-6 inline-block px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition">
              Go to homepage
            </router-link>
          </div>
          `}
        </template>
      </div>
    </div>
  </div>
</template>`;

    const fileContent = `<!-- ${view.title} Page -->
<script setup>
${scriptSetup}
</script>

${template}`;

    await fs.writeFile(path.join(authViewsDir, `${view.name}.vue`), fileContent);
  }

  // Layouts
  const layoutsDir = 'src/layouts';
  await fs.ensureDir(layoutsDir);

  await fs.writeFile(path.join(layoutsDir, 'AppLayout.vue'), `<script setup>
import { useAuthStore } from '${authStorePath}';
const authStore = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex justify-between items-center h-16">
          <router-link to="/" class="flex items-center">
            <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white mr-3">
              <span class="i-mdi-account text-xl"></span>
            </div>
            <span class="text-xl font-bold text-gray-900">MyApp</span>
          </router-link>
          
          <nav class="flex items-center space-x-6">
            <template v-if="authStore.user">
              <div class="relative group">
                <button class="flex items-center focus:outline-none">
                  <span class="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10"></span>
                  <span class="ml-2 text-sm font-medium text-gray-700">{{ authStore.user.name || authStore.user.email }}</span>
                  <span class="i-mdi-chevron-down ml-1 text-gray-500"></span>
                </button>
                
                <div class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 opacity-0 invisible 
                            group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <router-link to="/account" 
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <span class="i-mdi-account-outline mr-2"></span> My Account
                  </router-link>
                  <a href="#" 
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <span class="i-mdi-cog-outline mr-2"></span> Settings
                  </a>
                  <button @click="authStore.logout" 
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                    <span class="i-mdi-logout mr-2"></span> Sign out
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <router-link to="/login" 
                class="text-sm font-medium text-gray-700 hover:text-primary transition">
                Sign in
              </router-link>
              <router-link to="/register" 
                class="text-sm font-medium bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition">
                Create account
              </router-link>
            </template>
          </nav>
        </div>
      </div>
    </header>

    <main class="flex-grow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <router-view />
      </div>
    </main>

    <footer class="bg-white border-t mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p class="text-center text-sm text-gray-500">
          &copy; ${new Date().getFullYear()} MyApp. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>`);

  await fs.writeFile(path.join(layoutsDir, 'GuestLayout.vue'), `<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <router-view />
  </div>
</template>`);
}