const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const {
  listNotifications,
  markSingleNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

router.use(authenticate);
router.use(enforceMaintenanceMode);
router.use(enforceAccountAccess);

router.get("/", listNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markSingleNotificationRead);

module.exports = router;
