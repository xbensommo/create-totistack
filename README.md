# ✨ create-totistack ✨

## Elevate Your Vue 3 + Firebase Development

`create-totistack` is a powerful and interactive command-line interface (CLI) tool designed to rapidly scaffold production-ready Vue 3 applications integrated with Firebase (Firestore and Authentication), Pinia for state management, Vue Router for navigation, and Tailwind CSS for styling. It streamlines the initial setup, allowing developers to jump directly into building features, not boilerplate.

### Why create-totistack?

Building a modern web application often involves repetitive setup tasks: project initialization, configuring state management, setting up routing, integrating authentication, defining database schemas, and creating basic CRUD forms. `create-totistack` automates these steps, providing you with a robust and scalable foundation tailored to your specific project needs.

## 🚀 Features

`create-totistack` offers a comprehensive set of features to get your project off the ground:

  * **Interactive Project Creation:** A guided command-line experience to configure your application.
  * **Dynamic Firestore Collection Scaffolding:** Define your Firestore collections, including specific field names and their data types (string, number, boolean, array, object, timestamp, email).
  * **Automatic Vue Form Generation:** For each defined Firestore collection, `create-totistack` generates:
      * **`Create.vue` components:** Forms to add new documents to your collection, complete with basic input fields, validation, and Pinia store integration (`store.add<Collection>`).
      * **`Edit.vue` components:** Forms to update existing documents, supporting fetching data by ID, binding to form fields, validation, and Pinia store integration (`store.update<Collection>`).
      * **Inline Tailwind CSS:** All generated components use inline Tailwind CSS classes for rapid styling.
  * **Vue Router Integration:** Automatically sets up Vue Router and creates corresponding route entries for all generated Create and Edit forms, alongside core routes.
  * **Firebase Authentication Support:** Optionally includes:
      * Firebase Auth initialization.
      * Core authentication views (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`, `Unauthorized`).
      * Account and Settings views.
      * Basic authentication guards.
  * **Role-Based Authorization (Optional):** Adds a framework for implementing role-based access control if you enable authentication.
  * **Admin Panel Scaffold (Optional):** Generates a basic admin dashboard and users management view, ready for expansion.
  * **Landing Page (Optional):** Provides a clean, ready-to-use landing page for public access.
  * **Global Loading UI:** Integrates a global loading indicator (using `<Skeleton />` component) during router navigation and form submissions, enhancing user experience.
  * **Pinia State Management:** Configures a central Pinia store (`appStore`) with modules for your Firebase collections, including `add`, `update`, `fetch` operations.
  * **Zod-based Validation Stubs:** Generates validation files (`validate<Collection>.js`) for each collection, utilizing Zod (or a similar schema validation library) to ensure data integrity before Firestore operations.
  * **Environment Configuration:** Provides a `.env.example` file for easy Firebase credentials setup.
  * **Comprehensive Documentation:** Generates a `STORE_GUIDE.md` file with a summary of your project structure, included features, and generated collections with their fields.

## 📦 Technologies Used

The projects scaffolded by `create-totistack` leverage a modern and robust stack:

  * **Vue 3:** The progressive JavaScript framework for building user interfaces.
  * **Pinia:** The intuitive, type-safe, and light-weight state management library for Vue.
  * **Vue Router:** The official routing library for Vue.js.
  * **Firebase:** Google's comprehensive platform for web and mobile development, used for:
      * **Firestore:** NoSQL cloud database for data storage.
      * **Authentication:** Managed user authentication service.
  * **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
  * **Inquirer.js:** For interactive command-line prompts.
  * **fs-extra:** For file system operations.
  * **execa:** For executing external commands.

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your system:

  * **Node.js**: Version 18 or higher (LTS recommended).
  * **npm** (Node Package Manager) or **Yarn** or **pnpm**: Used for package installation.

### Installation & Usage

To create a new project, run the following command in your terminal:

```bash
npx create-totistack
```

This command will:

1.  **Prompt for your project name:**
    ```
    ? Enter project name: my-firebase-app
    ```
2.  **Guide you through collection setup:** You'll define each Firestore collection, specifying its name and then adding individual fields with their types.
    ```
    ? Enter name for collection 1: products
    ? Enter field name for 'products': title
    ? Select type for 'title': string
    ? Add another field to this collection? Yes
    ? Enter field name for 'products': price
    ? Select type for 'price': number
    ? Add another field to this collection? Yes
    ? Enter field name for 'products': inStock
    ? Select type for 'inStock': boolean
    ? Add another field to this collection? No
    ? Add another collection? Yes
    ? Enter name for collection 2: orders
    ...
    ? Add another collection? No
    ```
3.  **Ask about optional features:** You'll be prompted to enable or disable features like Firebase Auth, Admin Panel, Landing Page, and more.
    ```
    ? Add Firebase Auth support? (Y/n)
    ? Add role-based authorization? (y/N)
    ? Add authentication views (Login, Register, etc)? (Y/n)
    ? Add admin panel scaffold? (y/N)
    ? Add landing page? (Y/n)
    ? Add global loading UI? (Y/n)
    ? Run Firestore seeder after setup? (y/N)
    ```

### Post-Generation Steps

After `create-totistack` completes, follow these steps to get your new application running:

1.  **Navigate to your project directory:**
    ```bash
    cd your-project-name
    ```
2.  **Configure Firebase:**
      * Open the generated `.env.example` file.
      * Create a new file named `.env` in the root of your project.
      * Copy the contents of `.env.example` into `.env`.
      * Populate the Firebase environment variables with your actual Firebase project credentials (API Key, Auth Domain, Project ID, etc.). You can find these in your Firebase project settings under "Project settings" \> "General" \> "Your apps".
3.  **Run the development server:**
    ```bash
    npm run dev
    # or yarn dev
    # or pnpm dev
    ```
    Your application will now be running, typically on `http://localhost:5173/`.

## 📂 Project Structure Overview

A project generated by `create-totistack` follows a clean and modular structure:

```
your-project-name/
├── .env.example              # Example Firebase environment variables
├── package.json              # Project dependencies and scripts
├── public/                   # Static assets
├── src/
│   ├── assets/               # CSS, images, fonts
│   ├── components/           # Reusable UI components (e.g., Skeleton.vue)
│   ├── composables/          # Reusable Vue composition functions (e.g., useNotification.js)
│   ├── layouts/              # Vue layouts (e.g., AppLayout.vue, GuestLayout.vue, AdminLayout.vue)
│   ├── router/               # Vue Router configuration
│   │   └── index.js          # Main router file with dynamic routes
│   │   └── guards/           # Optional: Authentication and role guards
│   ├── stores/               # Pinia stores (appStore.js, plus stores for each collection)
│   │   └── appStore.js
│   │   └── <collectionName>Store.js
│   ├── utils/                # Utility functions (e.g., firebase.js initialization)
│   ├── validators/           # Data validation schemas (e.g., validateProduct.js)
│   ├── views/                # Page-level components
│   │   ├── auth/             # Authentication-related views (Login, Register, etc.)
│   │   ├── admin/            # Admin panel views (Dashboard, Users)
│   │   ├── <collectionName>/ # Views for specific collections
│   │   │   ├── Create.vue    # Form to create a new document
│   │   │   └── Edit.vue      # Form to edit an existing document
│   │   ├── HomeView.vue      # Default application home (if no landing page)
│   │   └── LandingPage.vue   # Public landing page (if enabled)
│   │   └── AccountView.vue   # User account settings
│   │   └── SettingsView.vue  # Application settings
│   ├── App.vue               # Main application component
│   └── main.js               # Entry point for Vue app
└── vite.config.js            # Vite configuration
```

## 🛠 Further Development

  * **Extend Generated Forms:** The generated forms provide a solid starting point. Customize their layout, add more complex input types, or integrate third-party UI libraries.
  * **Implement Authentication:** Utilize the generated authentication views and the `useAuth` composable to build your user login/registration flows.
  * **Build CRUD Interfaces:** Expand upon the generated `Create.vue` and `Edit.vue` components by creating `List.vue` and `Detail.vue` views for each collection to fully manage your data.
  * **Data Validation:** Enhance the Zod schemas in `src/validators` to implement more robust data validation rules.
  * **Role-Based Access Control:** Leverage the `requiresAuth` and `requiresAdmin` meta fields in `src/router/index.js` and implement the `authGuard` and `roleGuard` to secure your routes.
  * **Tailwind CSS Customization:** Modify `tailwind.config.js` to extend your theme, add custom components, or integrate plugins.

## 🤝 Contributing

Contributions are welcome\! If you have ideas for improvements, bug fixes, or new features, please feel free to open an issue or submit a pull request.

## 📄 License

This project is open-source and licensed under the [MIT License](https://www.google.com/search?q=LICENSE).

-----

Developed with ✨ by XBEN SOMMO.