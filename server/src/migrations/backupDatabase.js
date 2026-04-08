const mongoose = require("mongoose");
require("dotenv").config();

const collections = [
  'users',
  'admins',
  'clients',
  'providers',
  'services',
  'bookings',
  'conversations',
  'messages',
  'transactions',
  'disputes',
  'notifications',
  'activitylogs',
  'loginhistories',
  'platformsettings',
  'payouts',
  'reviews',
  'contactmessages'
];

const createBackup = async () => {
  console.log("💾 Creating database backup...");
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    const backup = {};
    
    for (const collectionName of collections) {
      try {
        const Model = mongoose.model(collectionName, new mongoose.Schema({}, { collectionName }));
        const data = await Model.find({}).lean();
        backup[collectionName] = data;
        console.log(`📦 Backed up ${data.length} documents from ${collectionName}`);
      } catch (error) {
        console.warn(`⚠️ Could not backup ${collectionName}:`, error.message);
        backup[collectionName] = [];
      }
    }

    // Save backup to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backup-${timestamp}.json`;
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved to ${backupPath}`);
    
    return backupPath;
    
  } catch (error) {
    console.error("❌ Backup failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
};

// Run if called directly
if (require.main === module) {
  createBackup();
}

module.exports = { createBackup };
