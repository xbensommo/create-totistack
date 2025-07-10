import fs from 'fs-extra';
import path from 'path';

/**
 * Generates authentication views, guards, layouts, and utility components like Skeleton, Toast, and Overlay.
 * @param {Object} answers - User responses from inquirer.
 * @param {string} answers.appStore - Name of the main app store folder.
 */
export default async function generateAuth() {
  const authStorePath = `@/stores/appStore`;

  const guardDir = 'src/router/guards';
  await fs.ensureDir(guardDir);

  await fs.writeFile(path.join(guardDir, 'authGuard.js'), `import { useAppStore } from '${authStorePath}';

export default (to, from, next) => {
  const authStore = useAppStore();
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login');
  } else if (to.meta.guestOnly && authStore.user) {
    next('/');
  } else {
    next();
  }
};`);


  const componentsDir = 'src/components';
  const composableDir = 'src/composables';
  await fs.ensureDir(componentsDir);
  await fs.ensureDir(composableDir);

  await fs.writeFile(path.join(componentsDir, 'PageSpinner.vue'), `<template>
   <div v-if="isLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 bg-opacity-50">
     <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-secondary"></div>
   </div>
 </template>

 <script setup>
 import { useAppStore } from '${authStorePath}'
 import { storeToRefs } from 'pinia';

 const loadingStore = useAppStore();
 const { isLoading } = storeToRefs(loadingStore);
 </script>

<style scoped>
/* You can add more complex spinner styles here if needed */
</style>
`);

  await fs.writeFile(path.join(componentsDir, 'Skeleton.vue'), `<template>
  <div v-if="loading" :class="['auth-card', containerClass]">
    <div class="space-y-4">
      <div class="skeleton h-6 w-3/4 mx-auto rounded"></div>
      <div class="skeleton h-4 w-full rounded"></div>
      <div class="skeleton h-4 w-5/6 rounded"></div>
      <div class="skeleton h-10 w-full rounded-lg mt-4"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: Boolean,
  containerClass: {
    type: String,
    default: 'w-full bg-green-200 rounded-2xl p-8 shadow-lg'
  }
})
</script>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s infinite ease-in-out;
}
@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>`);

  await fs.writeFile(path.join(componentsDir, 'LoadingOverlay.vue'), `<script setup>
import { ref } from 'vue';
const isLoading = ref(false);
const simulateLoading = () => {
  isLoading.value = true;
  setTimeout(() => isLoading.value = false, 2000);
};
</script>
<template>
  <div v-if="isLoading" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-xl">
      <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <p class="mt-4 text-center text-gray-600">Loading...</p>
    </div>
  </div>
</template>`);

  await fs.writeFile(path.join(componentsDir, 'Loader.vue'), `<style scoped>

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: .5;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

<template>
    <div v-if="loading" class="space-y-4">
        <div v-for="n in 3" :key="n" class="flex items-center p-3 bg-neutral-light rounded-xl animate-pulse">
            <div class="w-2 h-2 rounded-full mr-3 bg-gray-300"></div>
            <div class="flex-1">
                <div class="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div class="w-6 h-6 bg-gray-300 rounded-full"></div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    loading: {
        type: Boolean,
        default: true
    }
})
</script>`);

  await fs.writeFile(path.join(composableDir, 'useNotification.js'), `import { reactive } from 'vue'
const notification = reactive({ show: false, message: '' })
export function useNotification() {
  function showNotification(message, duration = 3000) {
    notification.message = message
    notification.show = true
    setTimeout(() => notification.show = false, duration)
  }
  return { notification, showNotification }
}`);

  await fs.writeFile(path.join(componentsDir, 'toastNotification.vue'), `<template>
  <div v-if="notification.show" class="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-md shadow-lg">
    <div class="flex items-center">
      <i class="fas fa-check-circle mr-2"></i>
      <span>{{ notification.message }}</span>
    </div>
  </div>
</template>
<script setup>
import { useNotification } from '@/composables/useNotification';
const { notification } = useNotification();
</script>`);

  await fs.writeFile(path.join(composableDir, 'useAsyncActionGuard.js'), `import { ref, onBeforeUnmount } from 'vue';
export function useAsyncActionGuard(unloadMessage = 'Changes in progress. Are you sure you want to leave?') {
  const isRunning = ref(false);
  const warnBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = unloadMessage;
  };
  const guard = async (fn) => {
    if (isRunning.value) return;
    isRunning.value = true;
    window.addEventListener('beforeunload', warnBeforeUnload);
    try {
      await fn();
    } finally {
      isRunning.value = false;
      window.removeEventListener('beforeunload', warnBeforeUnload);
    }
  };
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', warnBeforeUnload);
  });
  return { isRunning, guard };
}`);

  // Auth views, layouts, guards are already defined and will use the above components where needed.
}
