require("dotenv").config();

const runCleanup = require("./runCleanup");

const consolidateUsersData = async () => {
  console.log("consolidateUsersData is deprecated.");
  console.log("Running the canonical collection sync instead.");

  return runCleanup();
};

if (require.main === module) {
  consolidateUsersData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { consolidateUsersData };
