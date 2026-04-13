const express = require("express");
const router = express.Router();

const { authenticate, authorize, optionalAuth } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  deleteProvider,
  updateProviderMe,
  getProviderMe
} = require("../controllers/providerController");
const {
  getProviderDashboard,
  getEarnings,
  getBookingsTrend,
  getServicePerformance,
  getProviderPayouts,
  exportProviderPayouts,
  downloadProviderInvoice,
} = require("../controllers/providerStatsController");

// Protected "Me" endpoints
router.get("/me/profile", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, getProviderMe);
router.put("/me/profile", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, updateProviderMe);

// Provider Dashboard Stats
router.get("/stats/dashboard", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, getProviderDashboard);
router.get("/stats/earnings", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, getEarnings);
router.get("/stats/bookings", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, getBookingsTrend);
router.get("/stats/services", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, getServicePerformance);
router.get("/stats/payouts", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, getProviderPayouts);
router.get("/stats/payouts/export", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, exportProviderPayouts);
router.get("/stats/payouts/:id/invoice", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, downloadProviderInvoice);

// Public
router.get("/", optionalAuth, enforceMaintenanceMode, enforceAccountAccess, getProviders);
router.get("/:id", optionalAuth, enforceMaintenanceMode, enforceAccountAccess, getProviderById);

// Protected
router.post("/", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, createProvider);
router.put("/:id", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, updateProvider);
router.delete("/:id", authenticate, authorize("PROVIDER"), enforceMaintenanceMode, enforceAccountAccess, deleteProvider);

module.exports = router;
