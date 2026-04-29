const express = require("express");
const { authenticate } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const disputeController = require("../controllers/disputeController");

const router = express.Router();

router.use(
  authenticate,
  enforceMaintenanceMode
);

router.use((req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (!["client", "provider"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Only clients and providers can access disputes.",
    });
  }

  return next();
});

router.get("/", disputeController.listDisputes);
router.post("/", disputeController.createDispute);

module.exports = router;
