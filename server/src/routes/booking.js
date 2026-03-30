const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { enforceAccountAccess } = require("../middleware/accountAccess");
const bookingController = require("../controllers/bookingController");

// All booking routes require an authenticated user (CLIENT side)
router.use(authenticate);
router.use(enforceMaintenanceMode);
router.use(enforceAccountAccess);

// POST /api/bookings - create booking (and payment records)
router.post("/", bookingController.createBooking);

// GET /api/bookings - current user's bookings
router.get("/", bookingController.getMyBookings);

// PATCH /api/bookings/:id/status - update status
router.patch("/:id/status", bookingController.updateBookingStatus);

// POST /api/bookings/:id/review - create review
router.post("/:id/review", bookingController.createBookingReview);

// POST /api/bookings/:id/dispute - create dispute
router.post("/:id/dispute", bookingController.createBookingDispute);

module.exports = router;

