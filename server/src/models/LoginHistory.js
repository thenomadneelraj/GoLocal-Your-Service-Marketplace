const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "accountModel",
      required: true,
    },
    account: {
      type: String,
      required: true,
      trim: true,
    },
    accountModel: {
      type: String,
      enum: ["User", "Admin"],
      required: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    success: {
      type: Boolean,
      default: true,
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
