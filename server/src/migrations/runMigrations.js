require("dotenv").config();

const runCleanup = require("./runCleanup");

const runMigrations = async () => {
  console.log("Starting database migration...");
  console.log("This command now runs the canonical collection sync.");

  return runCleanup();
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
