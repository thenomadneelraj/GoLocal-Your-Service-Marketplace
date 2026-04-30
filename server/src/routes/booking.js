const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { enforceMaintenanceMode } = require("../middleware/maintenance");
const { attachAccountAccessState } = require("../middleware/accountAccess");
const bookingController = require("../controllers/bookingController");

// All booking routes require an authenticated user (CLIENT side)
router.use(authenticate);
router.use(enforceMaintenanceMode);
router.use(attachAccountAccessState);

// POST /api/bookings - create booking (and payment records)
router.post("/", bookingController.createBooking);
router.post("/draft", bookingController.createBookingDraft);

// GET /api/bookings - current user's bookings
router.get("/", bookingController.getMyBookings);

// GET /api/bookings/:id - current user's single booking
router.get("/:id", bookingController.getBookingById);

// PATCH /api/bookings/:id/payment - confirm booking payment method
router.patch("/:id/payment", bookingController.confirmBookingPayment);
router.post("/confirm", bookingController.confirmBookingCheckout);

// PATCH /api/bookings/:id/status - update status
router.patch("/:id/status", bookingController.updateBookingStatus);

// POST /api/bookings/:id/review - create review
router.post("/:id/review", bookingController.createBookingReview);

// POST /api/bookings/:id/dispute - create dispute
router.post("/:id/dispute", bookingController.createBookingDispute);

module.exports = router;

