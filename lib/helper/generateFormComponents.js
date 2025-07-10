// helper/generateFormComponents.js
import fs from "fs-extra";
import path from "path";
import { toPascalCase, toCamelCase } from "./helperF.js"; // Assuming helperF.js has these utilities

/**
 * @typedef {Object} CollectionConfig
 * @property {string} name - The name of the Firestore collection.
 * @property {Object.<string, string>} fields - An object where keys are field names and values are their data types.
 * @property {string} [dataType='object'] - The overall data type of the documents in the collection.
 */

/**
 * Generates the HTML for a form input based on field type.
 * @param {string} fieldName - The name of the field.
 * @param {string} fieldType - The data type of the field.
 * @returns {string} The HTML string for the input element.
 */
function generateInputFieldHtml(fieldName, fieldType) {
  const commonClasses =
    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2";
  const labelHtml = `<label for="${fieldName}" class="block text-sm font-medium text-gray-700 capitalize">${fieldName}</label>`;

  switch (fieldType) {
    case "string":
    case "email":
      return `
        <div>
          ${labelHtml}
          <input type="${
            fieldType === "email" ? "email" : "text"
          }" id="${fieldName}" v-model="form.${fieldName}" class="${commonClasses}" />
        </div>
      `;
    case "number":
      return `
        <div>
          ${labelHtml}
          <input type="number" id="${fieldName}" v-model.number="form.${fieldName}" class="${commonClasses}" />
        </div>
      `;
    case "boolean":
      return `
        <div class="flex items-center mt-4">
          <input type="checkbox" id="${fieldName}" v-model="form.${fieldName}" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <label for="${fieldName}" class="ml-2 block text-sm text-gray-900 capitalize">${fieldName}</label>
        </div>
      `;
    case "timestamp":
      return `
        <div>
          ${labelHtml}
          <input type="datetime-local" id="${fieldName}" v-model="form.${fieldName}" class="${commonClasses}" />
        </div>
      `;
    case "array":
      return `
        <div>
          ${labelHtml}
          <textarea id="${fieldName}" v-model="form.${fieldName}String" class="${commonClasses} h-20" placeholder="Enter comma-separated values"></textarea>
          <p class="mt-1 text-xs text-gray-500">Enter comma-separated values (e.g., item1, item2)</p>
        </div>
      `;
    case "object":
      return `
        <div>
          ${labelHtml}
          <textarea id="${fieldName}" v-model="form.${fieldName}Json" class="${commonClasses} h-32" placeholder="Enter JSON object"></textarea>
          <p class="mt-1 text-xs text-gray-500">Enter a valid JSON object (e.g., {"key": "value"})</p>
        </div>
      `;
    default:
      return `
        <div>
          ${labelHtml}
          <input type="text" id="${fieldName}" v-model="form.${fieldName}" class="${commonClasses}" />
          <p class="mt-1 text-xs text-gray-500">Note: Unknown field type '${fieldType}'. Defaulting to text input.</p>
        </div>
      `;
  }
}

/**
 * Generates the default value for a form field based on its type.
 * @param {string} fieldType - The data type of the field.
 * @returns {any} The default value.
 */
function getDefaultFieldValue(fieldType) {
  switch (fieldType) {
    case "string":
    case "email":
    case "timestamp":
      return "''";
    case "number":
      return "0";
    case "boolean":
      return "false";
    case "array":
      return "[]"; // Will be handled via string input
    case "object":
      return "{}"; // Will be handled via string input
    default:
      return "''";
  }
}

/**
 * Generates the content for a Create.vue component.
 * @param {CollectionConfig} collectionConfig - The configuration for the collection.
 * @returns {string} The content of the Create.vue file.
 */
function generateCreateComponentContent(collectionConfig) {
  const pascalCollectionName = toPascalCase(collectionConfig.name);
  const camelCollectionName = toCamelCase(collectionConfig.name);

  const formFieldsInit = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) => {
      if (fieldType === "array") {
        return `  ${fieldName}: ${getDefaultFieldValue(
          fieldType
        )}, // Array will be parsed from ${fieldName}String
  ${fieldName}String: ''`;
      }
      if (fieldType === "object") {
        return `  ${fieldName}: ${getDefaultFieldValue(
          fieldType
        )}, // Object will be parsed from ${fieldName}Json
  ${fieldName}Json: ''`;
      }
      return `  ${fieldName}: ${getDefaultFieldValue(fieldType)}`;
    })
    .join(",\n");

  const inputHtml = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) =>
      generateInputFieldHtml(fieldName, fieldType)
    )
    .join("\n\n");

  const arrayObjectParsing = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) => {
      if (fieldType === "array") {
        return `    if (form.value.${fieldName}String) {
      form.value.${fieldName} = form.value.${fieldName}String.split(',').map(s => s.trim());
    } else {
      form.value.${fieldName} = [];
    }`;
      }
      if (fieldType === "object") {
        return `    if (form.value.${fieldName}Json) {
      try {
        form.value.${fieldName} = JSON.parse(form.value.${fieldName}Json);
      } catch (e) {
        notification.error('Invalid JSON for ${fieldName}.');
        return; // Stop submission if JSON is invalid
      }
    } else {
      form.value.${fieldName} = {};
    }`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  return `
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from '@/stores/appStore'; // Adjust if storeName is dynamic
import { useNotification } from '@/composables/useNotification';
import { validate${pascalCollectionName} } from '@/validators/validate${pascalCollectionName}';
import Skeleton from '@/components/Skeleton.vue';

const router = useRouter();
const store = useStore();
const notification = useNotification();

const isLoading = ref(false);
const errors = ref([]);

const form = ref({
${formFieldsInit}
});

const handleSubmit = async () => {
  isLoading.value = true;
  errors.value = [];

  // Parse array and object fields from string/JSON input
${arrayObjectParsing}

  const validationErrors = await validate${pascalCollectionName}(form.value);
  if (validationErrors.length > 0) {
    errors.value = validationErrors;
    validationErrors.forEach(err => notification.error(err));
    isLoading.value = false;
    return;
  }

  try {
    await store.add${pascalCollectionName}(form.value);
    notification.success('${pascalCollectionName} created successfully!');
    router.push('/${camelCollectionName}'); // Redirect to collection list or dashboard
  } catch (error) {
    console.error('Error creating ${camelCollectionName}:', error);
    notification.error('Failed to create ${pascalCollectionName}. ' + error.message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h1 class="text-2xl font-bold text-gray-800 mb-6 text-center">Create New ${pascalCollectionName}</h1>

      <Skeleton v-if="isLoading" class="h-64 w-full" />

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        ${inputHtml}

        <div v-if="errors.length" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">Validation Errors:</strong>
          <ul class="mt-2 list-disc list-inside">
            <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
          </ul>
        </div>

        <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out">
          Create ${pascalCollectionName}
        </button>
      </form>
    </div>
  </div>
</template>
`;
}

/**
 * Generates the content for an Edit.vue component.
 * @param {CollectionConfig} collectionConfig - The configuration for the collection.
 * @returns {string} The content of the Edit.vue file.
 */
function generateEditComponentContent(collectionConfig) {
  const pascalCollectionName = toPascalCase(collectionConfig.name);
  const camelCollectionName = toCamelCase(collectionConfig.name);

  const formFieldsInit = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) => {
      if (fieldType === "array") {
        return `  ${fieldName}: [], // Array will be parsed from ${fieldName}String
  ${fieldName}String: ''`;
      }
      if (fieldType === "object") {
        return `  ${fieldName}: {}, // Object will be parsed from ${fieldName}Json
  ${fieldName}Json: ''`;
      }
      return `  ${fieldName}: null`; // Initialize with null for edit form
    })
    .join(",\n");

  const inputHtml = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) =>
      generateInputFieldHtml(fieldName, fieldType)
    )
    .join("\n\n");

  const arrayObjectParsingOnLoad = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) => {
      if (fieldType === "array") {
        return `    form.value.${fieldName}String = fetchedData.${fieldName} ? fetchedData.${fieldName}.join(', ') : '';`;
      }
      if (fieldType === "object") {
        return `    form.value.${fieldName}Json = fetchedData.${fieldName} ? JSON.stringify(fetchedData.${fieldName}, null, 2) : '';`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const arrayObjectParsingOnSubmit = Object.entries(collectionConfig.fields)
    .map(([fieldName, fieldType]) => {
      if (fieldType === "array") {
        return `    if (form.value.${fieldName}String) {
      form.value.${fieldName} = form.value.${fieldName}String.split(',').map(s => s.trim());
    } else {
      form.value.${fieldName} = [];
    }`;
      }
      if (fieldType === "object") {
        return `    if (form.value.${fieldName}Json) {
      try {
        form.value.${fieldName} = JSON.parse(form.value.${fieldName}Json);
      } catch (e) {
        notification.error('Invalid JSON for ${fieldName}.');
        return; // Stop submission if JSON is invalid
      }
    } else {
      form.value.${fieldName} = {};
    }`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  return `
<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from '@/stores/appStore'; // Adjust if storeName is dynamic
import { useNotification } from '@/composables/useNotification';
import { validate${pascalCollectionName} } from '@/validators/validate${pascalCollectionName}';
import Skeleton from '@/components/Skeleton.vue';

const route = useRoute();
const router = useRouter();
const store = useStore();
const notification = useNotification();

const isLoading = ref(true);
const errors = ref([]);
const id = route.params.id;

const form = ref({
  id: id, // Include ID for update
${formFieldsInit}
});

onMounted(async () => {
  if (!id) {
    notification.error('No ID provided for editing.');
    router.push('/${camelCollectionName}'); // Redirect if no ID
    return;
  }

  try {
    const fetchedData = await store.fetch${pascalCollectionName}(id);
    if (fetchedData) {
      // Assign fetched data to form, handling array/object strings
      Object.assign(form.value, fetchedData);
${arrayObjectParsingOnLoad}
    } else {
      notification.error('${pascalCollectionName} not found.');
      router.push('/${camelCollectionName}');
    }
  } catch (error) {
    console.error('Error fetching ${camelCollectionName}:', error);
    notification.error('Failed to load ${pascalCollectionName}. ' + error.message);
  } finally {
    isLoading.value = false;
  }
});

const handleSubmit = async () => {
  isLoading.value = true;
  errors.value = [];

  // Parse array and object fields from string/JSON input
${arrayObjectParsingOnSubmit}

  const validationErrors = await validate${pascalCollectionName}(form.value);
  if (validationErrors.length > 0) {
    errors.value = validationErrors;
    validationErrors.forEach(err => notification.error(err));
    isLoading.value = false;
    return;
  }

  try {
    await store.update${pascalCollectionName}(id, form.value);
    notification.success('${pascalCollectionName} updated successfully!');
    router.push('/${camelCollectionName}'); // Redirect to collection list or dashboard
  } catch (error) {
    console.error('Error updating ${camelCollectionName}:', error);
    notification.error('Failed to update ${pascalCollectionName}. ' + error.message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h1 class="text-2xl font-bold text-gray-800 mb-6 text-center">Edit ${pascalCollectionName}</h1>

      <Skeleton v-if="isLoading" class="h-64 w-full" />

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        ${inputHtml}

        <div v-if="errors.length" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">Validation Errors:</strong>
          <ul class="mt-2 list-disc list-inside">
            <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
          </ul>
        </div>

        <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out">
          Update ${pascalCollectionName}
        </button>
      </form>
    </div>
  </div>
</template>
`;
}

/**
 * Generates Create.vue and Edit.vue components for each collection.
 * @param {CollectionConfig[]} collections - Array of collection configurations.
 */
export async function generateFormComponents(collections) {
  const viewsDir = path.join("src", "views");

  for (const collectionConfig of collections) {
    const pascalCollectionName = toPascalCase(collectionConfig.name);
    const camelCollectionName = toCamelCase(collectionConfig.name);
    const collectionViewsDir = path.join(viewsDir, camelCollectionName);

    await fs.ensureDir(collectionViewsDir);

    // Generate Create.vue
    const createComponentPath = path.join(collectionViewsDir, "Create.vue");
    const createContent = generateCreateComponentContent(collectionConfig);
    await fs.writeFile(createComponentPath, createContent);
    console.log(`  📄 Generated ${createComponentPath}`);

    // Generate Edit.vue
    const editComponentPath = path.join(collectionViewsDir, "Edit.vue");
    const editContent = generateEditComponentContent(collectionConfig);
    await fs.writeFile(editComponentPath, editContent);
    console.log(`  📄 Generated ${editComponentPath}`);
  }
}
