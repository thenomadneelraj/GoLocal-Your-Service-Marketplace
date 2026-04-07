const mongoose = require("mongoose");
const {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  toBookingPersistenceStatus,
} = require("../utils/bookingStatus");

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    requirements: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      required: function() {
        return this.locationType === "offline"; 
      }
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [...BOOKING_STATUS_VALUES, "confirmed"],
      default: BOOKING_STATUS.PENDING,
      set: (value) => toBookingPersistenceStatus(value),
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "cod", "card", "cash"],
      default: "upi",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
