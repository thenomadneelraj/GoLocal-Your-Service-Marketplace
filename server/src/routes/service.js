const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const {
  listMyServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const router = express.Router();

router.use(
  authenticate,
  authorize("PROVIDER"),
  enforceMaintenanceMode,
  enforceAccountAccess
);

router.get("/me", listMyServices);
router.post("/", createService);
router.put("/:id", updateService);
router.delete("/:id", deleteService);

module.exports = router;
