const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Can also optionally be Admin, handled in logic
      required: true,
    },
    role: {
      type: String,
      required: true, // "client", "provider", "admin"
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    device: {
      type: String,
      trim: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
