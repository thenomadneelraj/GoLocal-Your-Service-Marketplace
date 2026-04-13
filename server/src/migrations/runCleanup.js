require('dotenv').config();

const { createBackup } = require("./backupDatabase");
const cleanupCollections = require("./cleanupCollections");

async function runCleanup() {
  try {
    console.log("Starting database cleanup process...");

    const backupPath = await createBackup();
    console.log(`Backup created at ${backupPath}`);

    await cleanupCollections();

    console.log("Database cleanup completed successfully!");
  } catch (error) {
    console.error("Database cleanup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCleanup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runCleanup;
