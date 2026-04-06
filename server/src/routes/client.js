const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const {
  getClientDashboard,
  getBookingsStats,
  getSpendingStats,
  getCategoryStats,
  getClientTransactions,
} = require("../controllers/clientStatsController");

router.use(authenticate, authorize("CLIENT"), enforceMaintenanceMode);

router.get("/me/dashboard", (req, res) => res.json({ success: true, message: "Client dashboard active" }));
router.get("/stats/dashboard", getClientDashboard);
router.get("/stats/bookings", enforceAccountAccess, getBookingsStats);
router.get("/stats/spending", enforceAccountAccess, getSpendingStats);
router.get("/stats/services", enforceAccountAccess, getCategoryStats);
router.get("/stats/transactions", enforceAccountAccess, getClientTransactions);

module.exports = router;
