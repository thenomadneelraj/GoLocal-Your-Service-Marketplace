const fs = require("fs");
const path = require("path");
const { EJSON } = require("bson");
const mongoose = require("mongoose");
require("dotenv").config();

const createBackup = async () => {
  console.log("Creating database backup...");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const backup = {};

    for (const collection of collections.sort((left, right) => left.name.localeCompare(right.name))) {
      const data = await db.collection(collection.name).find({}).toArray();
      backup[collection.name] = data;
      console.log(`Backed up ${data.length} documents from ${collection.name}`);
    }

    const backupDir = path.resolve(__dirname, "../backups");
    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

    fs.writeFileSync(
      backupPath,
      EJSON.stringify(backup, null, 2, { relaxed: false }),
      "utf8"
    );
    console.log(`Backup saved to ${backupPath}`);

    return backupPath;
  } catch (error) {
    console.error("Backup failed:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
};

if (require.main === module) {
  createBackup().catch(() => process.exit(1));
}

module.exports = { createBackup };
