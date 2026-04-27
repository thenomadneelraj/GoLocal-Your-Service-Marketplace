const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function clearDatabase() {
  try {
    await connectDB();
    console.log("🔄 Connecting to database...");

    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log("✅ Database is already empty");
      return;
    }

    console.log(`📋 Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('\n⚠️  Are you sure you want to delete ALL collections? This action cannot be undone. (yes/no): ', (response) => {
        rl.close();
        resolve(response.toLowerCase());
      });
    });

    if (answer !== 'yes') {
      console.log("❌ Operation cancelled");
      return;
    }

    // Drop all collections
    console.log("\n🗑️  Dropping collections...");
    
    for (const collection of collections) {
      try {
        await db.collection(collection.name).drop();
        console.log(`  ✅ Dropped ${collection.name}`);
      } catch (error) {
        console.log(`  ⚠️  ${collection.name}: ${error.message}`);
      }
    }

    console.log("\n✅ Database cleared successfully!");
    
  } catch (error) {
    console.error("❌ Error clearing database:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run if called directly
if (require.main === module) {
  clearDatabase();
}

module.exports = clearDatabase;
