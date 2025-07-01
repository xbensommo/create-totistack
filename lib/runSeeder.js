// lib/runSeeder.js
import chalk from 'chalk';
import {execa} from 'execa';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function runSeeder(userCollections) {
  try {
    console.log(chalk.blue('Running Firestore seeder...'));
    
    // Copy seeder from templates
    const seederPath = path.join(process.cwd(), 'seed.js');
    await fs.copyFile(
      path.join(__dirname, './templates/seed.js'),
      seederPath
    );
    
    // Update seeder with user's collections
    let seederCode = await fs.readFile(seederPath, 'utf8');
    
    // Create seed configuration based on user input
    const seedConfig = {
      users: userCollections.includes('users') ? 200 : 0,
      locations: userCollections.includes('locations') ? 14 : 0,
      products: userCollections.includes('products') ? 40 : 0,
      chats: userCollections.includes('chats') ? 30 : 0,
      messagesPerChat: { min: 3, max: 15 },
      reviews: userCollections.includes('reviews') ? 25 : 0,
      reports: userCollections.includes('reports') ? 100 : 0,
      favorites: userCollections.includes('favorites') ? 60 : 0,
      recommendations: userCollections.includes('recommendations') ? 100 : 0
    };
    
    // Inject user's collections into seeder
    seederCode = seederCode.replace(
      /const SEED_CONFIG = \{([^}]*)\};/,
      `const SEED_CONFIG = ${JSON.stringify(seedConfig, null, 2)};`
    );
    
    // Add collection check logic
    seederCode = seederCode.replace(
      '// Seed locations first',
      `// Only seed requested collections
      const seedCollections = ${JSON.stringify(userCollections)};
      
      async function seedDatabase() {
        try {
          console.log('Starting database seeding for collections:', seedCollections.join(', '));`
    );
    
    // Modify seeding calls to check for requested collections
    seederCode = seederCode.replace(
      /await seedLocations\(\);/g,
      `if (seedCollections.includes('locations')) {
        locations = await seedLocations();
      } else {
        console.log('Skipping locations seeding');
        locations = [];
      }`
    );
    
    seederCode = seederCode.replace(
      /const userRefs = await seedUsers\(locations\);/g,
      `let userRefs = [];
      if (seedCollections.includes('users')) {
        userRefs = await seedUsers(locations);
      } else {
        console.log('Skipping users seeding');
      }`
    );
    
    // Add similar checks for all other seed functions
    const collectionMapping = {
      products: 'seedProducts(userRefs, locations)',
      chats: 'seedChats(userRefs, productRefs)',
      reviews: 'seedReviews(userRefs)',
      reports: 'seedReports(userRefs)',
      favorites: 'seedFavorites(userRefs, productRefs)',
      recommendations: 'seedRecommendations(userRefs, productRefs)'
    };
    
    for (const [collection, funcCall] of Object.entries(collectionMapping)) {
      const regex = new RegExp(`await ${funcCall};`, 'g');
      seederCode = seederCode.replace(
        regex,
        `if (seedCollections.includes('${collection}')) {
          await ${funcCall};
        } else {
          console.log('Skipping ${collection} seeding');
        }`
      );
    }
    
    await fs.writeFile(seederPath, seederCode);
    
    // Install seeder dependencies
    await execa('npm', ['install', 'firebase-admin', '@faker-js/faker', 'uuid'], { stdio: 'inherit' });
    
    // Run the seeder
    await execa('node', ['seed.js'], { stdio: 'inherit' });
    
    console.log(chalk.green('✅ Firestore data seeded successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Error seeding Firestore:'), error);
  }
}