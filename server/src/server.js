require("dotenv").config();

const app = require("./app");
const PORT = process.env.PORT || 5001;
const connectDB = require("./config/db");
const { ensureSingleAdmin } = require("./services/adminBootstrapService");
const {
  backfillClientApprovalStatus,
} = require("./services/accountApprovalMigrationService");
const { ensureVerificationUploadDir } = require("./utils/verificationFiles");

const startServer = async () => {
  try {
    // Try to connect to DB but don't fail if it's not available
    try {
      await connectDB();
      await ensureSingleAdmin();
      await backfillClientApprovalStatus();
    } catch (dbError) {
      console.warn(
        `⚠️ Database connection failed, starting server without DB: ${dbError.message}`,
      );
    }

    ensureVerificationUploadDir();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
