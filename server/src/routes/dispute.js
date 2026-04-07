const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const disputeController = require("../controllers/disputeController");

const router = express.Router();

router.use(
  authenticate,
  authorize("CLIENT"),
  enforceMaintenanceMode,
  enforceAccountAccess
);

router.get("/", disputeController.listDisputes);
router.post("/", disputeController.createDispute);

module.exports = router;
