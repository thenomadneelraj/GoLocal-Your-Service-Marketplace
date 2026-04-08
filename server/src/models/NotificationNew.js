const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["booking", "message", "payment", "system", "dispute"],
      default: "system",
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    actionText: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NotificationNew", notificationSchema);
