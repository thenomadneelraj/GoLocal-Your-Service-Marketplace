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
      ref: "User",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    selectedServices: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
        title: {
          type: String,
          trim: true,
          default: "",
        },
        category: {
          type: String,
          trim: true,
          default: "",
        },
        price: {
          type: Number,
          min: 0,
          default: 0,
        },
        duration: {
          type: String,
          trim: true,
          default: "",
        },
        locationType: {
          type: String,
          trim: true,
          default: "offline",
        },
      },
    ],
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
      required: function () {
        return this.locationType === "offline";
      },
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
      enum: ["upi", "cod"],
      default: "upi",
    },
    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
        default: "",
      },
      createdAt: {
        type: Date,
      },
      updatedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true },
);

// Essential indexes only
bookingSchema.index({ clientId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ bookingDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
