require("dotenv").config();

const app = require("./app");
const PORT = process.env.PORT || 5000;
const connectDB = require("./config/db");
const { ensureSingleAdmin } = require("./services/adminBootstrapService");

const startServer = async () => {
  try {
    await connectDB();
    await ensureSingleAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
