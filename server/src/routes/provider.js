const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  deleteProvider
} = require("../controllers/providerController");

/*

// DEBUG — check if functions are defined
console.log("Provider Controller Functions:", {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  deleteProvider
});

*/

// Public
router.get("/", getProviders);
router.get("/:id", getProviderById);

// Protected
router.post("/", authenticate, authorize("PROVIDER"), createProvider);
router.put("/:id", authenticate, authorize("PROVIDER"), updateProvider);
router.delete("/:id", authenticate, authorize("PROVIDER"), deleteProvider);

module.exports = router;
