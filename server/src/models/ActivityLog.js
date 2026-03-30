const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Can also be Admin
      required: true,
    },
    role: {
      type: String,
      required: true, // "client", "provider", "admin"
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true, // "booking", "payment", etc.
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
