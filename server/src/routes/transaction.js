const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

router.use(
  authenticate,
  authorize("CLIENT"),
  enforceMaintenanceMode,
  enforceAccountAccess
);

router.get("/", transactionController.listTransactions);
router.post("/create", transactionController.createTransaction);
router.get("/export", transactionController.exportTransactions);
router.get("/:id/invoice", transactionController.downloadInvoice);

module.exports = router;
