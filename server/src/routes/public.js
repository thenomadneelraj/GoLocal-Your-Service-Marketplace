const express = require("express");
const adminWorkspaceController = require("../controllers/adminWorkspaceController");

const router = express.Router();

// Public settings endpoint that doesn't require authentication
router.get("/settings", adminWorkspaceController.getPublicSettings);

module.exports = router;