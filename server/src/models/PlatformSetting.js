const mongoose = require("mongoose");

const platformSettingSchema = new mongoose.Schema(
  {
    commissionPercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    commissionRate: {
      type: Number,
      default: undefined,
      min: 0,
      max: 100,
    },
    currency: {
      type: String,
      default: "USD",
    },
    platformName: {
      type: String,
      trim: true,
      default: "GoLocal",
    },
    supportEmail: {
      type: String,
      trim: true,
      default: "support@golocal.com",
    },
    maxBookingLimit: {
      type: Number,
      default: 10,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformSetting", platformSettingSchema);
