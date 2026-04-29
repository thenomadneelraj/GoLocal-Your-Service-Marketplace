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
    services: [
      {
        title: {
          type: String,
          trim: true,
          default: "",
        },
        price: {
          type: Number,
          min: 0,
          default: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    date: {
      type: Date,
    },
    time: {
      type: String,
      trim: true,
      default: "",
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
    transactionId: {
      type: String,
      trim: true,
      default: "",
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

bookingSchema.pre("validate", function syncContractAliases() {
  if (!this.services?.length && this.selectedServices?.length) {
    this.services = this.selectedServices.map((service) => ({
      title: service.title,
      price: service.price,
    }));
  }

  if (!this.totalAmount) {
    this.totalAmount = this.price || 0;
  }

  if (!this.date && this.bookingDate) {
    this.date = this.bookingDate;
  }

  if (!this.time && this.timeSlot) {
    this.time = this.timeSlot;
  }
});

// Essential indexes only
bookingSchema.index({ clientId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ bookingDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
