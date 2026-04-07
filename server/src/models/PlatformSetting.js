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
    maintenanceMessage: {
      type: String,
      trim: true,
      default:
        "Website is currently under maintenance. Please check back soon.",
    },
    maxBookingLimit: {
      type: Number,
      default: 10,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    manualProviderReview: {
      type: Boolean,
      default: true,
    },
    disputeEscalationHours: {
      type: Number,
      default: 4,
      min: 1,
    },
    bookingReminderHours: {
      type: Number,
      default: 24,
      min: 1,
    },
    websocketMonitoring: {
      type: Boolean,
      default: true,
    },
    exportRetentionDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    automationProfile: {
      type: String,
      trim: true,
      default: "Managed",
    },
    controlDepth: {
      type: String,
      trim: true,
      default: "High",
    },
    reminderWindowLabel: {
      type: String,
      trim: true,
      default: "24h",
    },
    lastCacheClearedAt: {
      type: Date,
    },
    lastSecurityAuditAt: {
      type: Date,
    },
    lastExportedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformSetting", platformSettingSchema);
