const express = require("express");

const { authenticate } = require("../middleware/auth");
const adminWorkspaceController = require("../controllers/adminWorkspaceController");

const router = express.Router();

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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

router.use(authenticate, isAdmin);

router.get("/dashboard", adminWorkspaceController.getDashboard);

router.get("/users", adminWorkspaceController.getUsers);
router.patch("/users/:id/status", adminWorkspaceController.updateUserStatus);
router.get(
  "/verification-requests",
  adminWorkspaceController.getVerificationRequests
);
router.get(
  "/verification-requests/:id",
  adminWorkspaceController.getVerificationRequestById
);
router.patch(
  "/verification-requests/:id",
  adminWorkspaceController.updateVerificationRequestStatus
);
router.patch(
  "/users/:id/verification",
  adminWorkspaceController.updateUserVerificationStatus
);

router.get("/bookings", adminWorkspaceController.getBookings);
router.get("/bookings/summary", adminWorkspaceController.getBookingsSummary);

router.get("/transactions", adminWorkspaceController.getTransactions);
router.get(
  "/transactions/summary",
  adminWorkspaceController.getTransactionsSummary
);
router.get(
  "/transactions/:id/invoice",
  adminWorkspaceController.downloadTransactionInvoice
);

router.get("/disputes", adminWorkspaceController.getDisputes);
router.get("/disputes/summary", adminWorkspaceController.getDisputesSummary);
router.patch(
  "/disputes/:id/status",
  adminWorkspaceController.updateDisputeStatus
);

router.get(
  "/contact-messages",
  adminWorkspaceController.getContactMessages
);

router.get("/settings", adminWorkspaceController.getSettings);
router.put("/settings", adminWorkspaceController.updateSettings);

// Public settings endpoint that doesn't require admin access
router.get("/public-settings", adminWorkspaceController.getPublicSettings);

router.get(
  "/settings/advanced",
  adminWorkspaceController.getAdvancedSettings
);
router.put(
  "/settings/advanced",
  adminWorkspaceController.updateAdvancedSettings
);

router.get("/settings/cache", adminWorkspaceController.getCacheSettings);
router.post(
  "/settings/cache/refresh",
  adminWorkspaceController.refreshCache
);
router.post("/settings/cache/clear", adminWorkspaceController.clearCache);

router.get("/settings/export", adminWorkspaceController.getExportSettings);
router.post("/settings/export", adminWorkspaceController.createExport);

router.get("/settings/security", adminWorkspaceController.getSecuritySettings);
router.post(
  "/settings/security/audit-snapshot",
  adminWorkspaceController.runSecurityAuditSnapshot
);

module.exports = router;
