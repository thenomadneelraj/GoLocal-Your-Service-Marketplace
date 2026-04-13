const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: String, // e.g., "1 hour", "30 mins"
      required: true,
      default: "1 hour",
    },
    locationType: {
      type: String,
      enum: ["online", "offline"],
      required: true,
      default: "offline",
    },
    images: [String],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for improved admin query performance
serviceSchema.index({ category: 1 });
serviceSchema.index({ providerId: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Service", serviceSchema);
