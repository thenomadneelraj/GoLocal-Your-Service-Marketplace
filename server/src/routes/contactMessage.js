const express = require("express");
const { authenticate, optionalAuth, authorize } = require("../middleware/auth");

const {
  createContactMessage,
  listMyContactMessages,
} = require("../controllers/contactMessageController");

const router = express.Router();

router.get("/me", authenticate, authorize("CLIENT", "PROVIDER"), listMyContactMessages);
router.post("/", optionalAuth, createContactMessage);

module.exports = router;
