const mongoose = require("mongoose");
const connectDB = require("../config/db");

const migrationMap = {
  'bookingnews': 'bookings',
  'conversationnews': 'conversations', 
  'disputenews': 'disputes',
  'messagenews': 'messages',
  'notificationnews': 'notifications',
  'servicenews': 'services',
  'transactionnews': 'transactions',
  'usernews': 'users'
};

async function migrateCollections() {
  try {
    await connectDB();
    console.log("🔄 Starting migration...");

    for (const [sourceCollection, targetCollection] of Object.entries(migrationMap)) {
      console.log(`\n📦 Migrating ${sourceCollection} -> ${targetCollection}`);
      
      // Get source collection
      const sourceModel = mongoose.connection.db.collection(sourceCollection);
      const targetModel = mongoose.connection.db.collection(targetCollection);
      
      // Check if source has data
      const sourceCount = await sourceModel.countDocuments();
      const targetCount = await targetModel.countDocuments();
      
      console.log(`  Source documents: ${sourceCount}`);
      console.log(`  Target documents: ${targetCount}`);
      
      if (sourceCount === 0) {
        console.log(`  ⚠️  ${sourceCollection} is empty, skipping...`);
        continue;
      }
      
      if (targetCount > 0) {
        console.log(`  ⚠️  ${targetCollection} already has ${targetCount} documents`);
        const answer = await prompt(`  Continue and merge? (y/N): `);
        if (answer.toLowerCase() !== 'y') {
          console.log(`  ❌ Skipped ${sourceCollection}`);
          continue;
        }
      }
      
      // Migrate data
      const sourceData = await sourceModel.find({}).toArray();
      
      if (sourceData.length > 0) {
        await targetModel.insertMany(sourceData);
        console.log(`  ✅ Migrated ${sourceData.length} documents`);
        
        // Optional: Clear source collection after successful migration
        const answer = await prompt(`  Clear ${sourceCollection} after migration? (y/N): `);
        if (answer.toLowerCase() === 'y') {
          await sourceModel.deleteMany({});
          console.log(`  🗑️  Cleared ${sourceCollection}`);
        }
      }
    }
    
    console.log("\n✅ Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Simple prompt function for Node.js
function prompt(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  migrateCollections();
}

module.exports = migrateCollections;
