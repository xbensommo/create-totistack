// templates/seed.js (modified)
import admin from 'firebase-admin';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Use emulator if configured
if (process.env.VITE_FIREBASE_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  console.log("🔥 Using Firebase emulators");
}

// Initialize Firebase
admin.initializeApp({ 
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  credential: admin.credential.cert({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

if (process.env.VITE_FIREBASE_EMULATOR === 'true') {
  db.settings({
    host: "localhost:8080",
    ssl: false
  });
}

// Configuration - WILL BE INJECTED BY CLI
const SEED_CONFIG = {
  users: 200,
  locations: 14,
  products: 40,
  chats: 30,
  messagesPerChat: { min: 3, max: 15 },
  reviews: 25,
  reports: 100,
  favorites: 60,
  recommendations: 100
};

// ... (rest of the original seeder code remains unchanged)

// Only seed requested collections
const seedCollections = ['users', 'products']; // WILL BE INJECTED BY CLI

async function seedDatabase() {
  try {
    console.log('Starting database seeding for collections:', seedCollections.join(', '));
    
    let locations = [];
    if (seedCollections.includes('locations')) {
      locations = await seedLocations();
    } else {
      console.log('Skipping locations seeding');
    }
    
    let userRefs = [];
    if (seedCollections.includes('users')) {
      userRefs = await seedUsers(locations);
    } else {
      console.log('Skipping users seeding');
    }
    
    let productRefs = [];
    if (seedCollections.includes('products')) {
      if (userRefs.length > 0 && locations.length > 0) {
        productRefs = await seedProducts(userRefs, locations);
      } else {
        console.log('Skipping products - missing dependencies');
      }
    } else {
      console.log('Skipping products seeding');
    }
    
    if (seedCollections.includes('chats')) {
      if (userRefs.length > 0 && productRefs.length > 0) {
        await seedChats(userRefs, productRefs);
      } else {
        console.log('Skipping chats - missing dependencies');
      }
    } else {
      console.log('Skipping chats seeding');
    }
    
    // ... similar checks for other collections
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();