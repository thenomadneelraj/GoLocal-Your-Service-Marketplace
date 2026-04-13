const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetType: {
      type: String,
      enum: ["provider", "client", "platform"],
      default: "provider",
    },
    threadKey: {
      type: String,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "rejected", "escalated"],
      default: "open",
    },
    resolutionNote: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for improved admin query performance
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ bookingId: 1 });
disputeSchema.index({ reporterId: 1 });
disputeSchema.index({ clientId: 1 });
disputeSchema.index({ providerId: 1 });
disputeSchema.index({ targetUserId: 1 });
disputeSchema.index({ targetType: 1 });

module.exports = mongoose.model("Dispute", disputeSchema);
