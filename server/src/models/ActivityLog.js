const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    role: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      default: "admin",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "actorModel",
    },
    actorModel: {
      type: String,
      enum: ["User", "Admin"],
    },
    actorRole: {
      type: String,
      trim: true,
    },
    targetType: {
      type: String,
      trim: true,
    },
    targetId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
