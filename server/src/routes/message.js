const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const {
  listConversations,
  getConversationThread,
  getMessageContact,
  sendMessage,
  markConversationRead,
} = require("../controllers/messageController");

router.use(
  authenticate,
  authorize("CLIENT", "PROVIDER"),
  enforceMaintenanceMode,
  enforceAccountAccess,
);

router.get("/", listConversations);
router.post("/", sendMessage);
router.get("/contact/:userId", getMessageContact);
router.get("/booking/:bookingId", getConversationThread);
router.put("/booking/:bookingId/read", markConversationRead);

module.exports = router;
