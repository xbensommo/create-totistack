import fs from "fs-extra";
import path from "path";

/**
 * Generates a Vue Create form component for a given collection with dynamic fields and validation
 * @param {string} collectionName - e.g., "products"
 * @param {string} appStore - e.g., "appStore"
 * @param {Array<{ name: string, type: string }>} fields - user-defined fields and types
 */
export async function generateCreateView(collectionName, appStore, fields) {
  const CollectionName =
    collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
  const viewDir = `src/views/${collectionName}`;
  await fs.ensureDir(viewDir);

  const formFieldsObj = fields
    .map(
      (f) =>
        `${f.name}: ${
          f.type === "number" ? 0 : f.type === "boolean" ? false : "''"
        }`
    )
    .join(",\n  ");

  const formInputs = fields
    .map((f) => generateFieldInput(f))
    .join("\n\n      ");

  const fileContent = `<!-- src/views/${collectionName}/Create.vue -->

<template>
  <div class="max-w-xl mx-auto mt-12 px-4 py-6 bg-white rounded-xl shadow-md">
    <Skeleton v-if="loading" />
    
    <form v-else @submit.prevent="handleSubmit" class="space-y-5">
      ${formInputs}

      <button
        type="submit"
        class="w-full py-2 px-4 bg-primary text-white font-semibold rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
      >
        Submit
      </button>
    </form>
  </div>
</template>  
<script setup>
import { ref } from 'vue';
import { validate${CollectionName} } from '@/validators/validate${collectionName}.js';
import { useNotification } from '@/composables/useNotification';
import Skeleton from '@/components/Skeleton.vue';
import { store } from '@/stores/${appStore}';

const form = ref({
  ${formFieldsObj}
});

const loading = ref(false);
const { showNotification } = useNotification();

const handleSubmit = async () => {
  const errors = validate${CollectionName}(form.value);
  if (errors.length) {
    showNotification(errors.join(', '));
    return;
  }

  loading.value = true;
  try {
    await store.add${CollectionName}(form.value);
    showNotification('✅ Successfully added!');
  } catch (err) {
    showNotification(err?.message || '❌ Failed to create item.');
  } finally {
    loading.value = false;
  }
};
</script>
`;

  await fs.writeFile(path.join(viewDir, "Create.vue"), fileContent);
}
