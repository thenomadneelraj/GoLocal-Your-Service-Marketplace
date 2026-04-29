const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { canAcceptBookings, canBook, getAccountStatusMessage } = require("../utils/accountState");
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
);

const enforceApprovedMessaging = (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();
  const allowed =
    (role === "client" && canBook(req.user)) ||
    (role === "provider" && canAcceptBookings(req.user));

  if (allowed) {
    return next();
  }

  return res.status(403).json({
    success: false,
    code: "ACCOUNT_ACTION_RESTRICTED",
    message: getAccountStatusMessage(req.user),
  });
};

router.get("/", enforceApprovedMessaging, listConversations);
router.post("/", enforceApprovedMessaging, sendMessage);
router.get("/contact/:userId", enforceApprovedMessaging, getMessageContact);
router.get("/booking/:bookingId", enforceApprovedMessaging, getConversationThread);
router.put("/booking/:bookingId/read", enforceApprovedMessaging, markConversationRead);

module.exports = router;
