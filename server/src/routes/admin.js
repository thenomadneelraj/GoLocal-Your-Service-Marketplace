const express = require('express');
const router = express.Router();

const adminService = require("../services/adminService");
const { authenticate } = require("../middleware/auth");
const adminManagementController = require("../controllers/adminManagementController");
const adminStatsController = require("../controllers/adminStatsController");

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Apply admin middleware to all routes
router.use(authenticate, isAdmin);

// GET /api/admin/admin-dashboard - Dashboard statistics
router.get("/admin-dashboard", async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/stats/* - Admin Dashboard Charts
router.get("/stats/users-growth", adminStatsController.getUsersGrowth);
router.get("/stats/revenue", adminStatsController.getRevenue);
router.get("/stats/bookings", adminStatsController.getBookings);
router.get("/stats/services", adminStatsController.getServicesDist);

// GET /api/admin/users - List all users with pagination
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const result = await adminService.getAllUsers(
      parseInt(page),
      parseInt(limit),
      role
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/providers - List all providers with user details
router.get("/providers", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await adminService.getAllProviders(
      parseInt(page),
      parseInt(limit)
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/admin/users/:id - Update user status
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, status } = req.body;
    
    const user = await adminService.updateUserStatus(
      id,
      status !== undefined ? status : isActive
    );
    res.json({
      success: true,
      message: 'User status updated',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/admin/providers/:id - Verify/unverify provider
router.put("/providers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, approvalStatus } = req.body;
    
    const provider = await adminService.updateProviderStatus(
      id,
      approvalStatus !== undefined ? approvalStatus : isApproved
    );
    res.json({
      success: true,
      message: 'Provider status updated',
      data: provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/users/:id - Get single user
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await adminService.getUserById(id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/providers/:id - Get single provider
router.get("/providers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await adminService.getProviderById(id);
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 1️⃣ Service Catalog
router.get("/services", adminManagementController.listServices);
router.post("/services", adminManagementController.createService);
router.put("/services/:id", adminManagementController.updateService);
router.delete("/services/:id", adminManagementController.deleteService);
router.post(
  "/services/:id/toggle",
  adminManagementController.toggleServiceStatus
);
router.post(
  "/services/:id/assign-provider",
  adminManagementController.assignProviderToService
);

// 2️⃣ Transactions
router.get("/transactions", adminManagementController.listTransactions);

// 3️⃣ Payouts
router.get("/payouts", adminManagementController.listPayouts);
router.post("/payouts/:id/mark-paid", adminManagementController.markPayoutPaid);

// 4️⃣ Ratings & Reviews
router.get("/reviews", adminManagementController.listReviews);
router.delete("/reviews/:id", adminManagementController.deleteReview);
router.post("/reviews/:id/flag", adminManagementController.flagReview);

// 5️⃣ Disputes
router.get("/disputes", adminManagementController.listDisputes);
router.post("/disputes", adminManagementController.createDispute);
router.put("/disputes/:id/status", adminManagementController.updateDisputeStatus);

// 6️⃣ Platform Settings
router.get("/settings", adminManagementController.getPlatformSettings);
router.put("/settings", adminManagementController.updatePlatformSettings);

// 7️⃣ Security
router.get("/security/login-history", adminManagementController.listLoginHistory);
router.get("/security/activity-logs", adminManagementController.listActivityLogs);

module.exports = router;
