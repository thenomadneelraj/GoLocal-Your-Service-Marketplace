const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  platformName: {
    type: String,
    trim: true,
    default: "GoLocal",
  },
  supportEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: "support@golocal.com",
  },
  currency: {
    type: String,
    trim: true,
    uppercase: true,
    default: "INR",
  },
  commissionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 10,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceMessage: {
    type: String,
    trim: true,
    default: "Platform is under maintenance. Please try again later.",
  },
  controlDepth: {
    type: String,
    trim: true,
    default: "standard",
  },
  automationProfile: {
    type: String,
    trim: true,
    default: "balanced",
  },
  reminderWindowLabel: {
    type: String,
    trim: true,
    default: "24 hours",
  },
  exportRetentionDays: {
    type: Number,
    min: 1,
    default: 90,
  },
  manualProviderReview: {
    type: Boolean,
    default: true,
  },
  disputeEscalationHours: {
    type: Number,
    min: 1,
    default: 48,
  },
  bookingReminderHours: {
    type: Number,
    min: 1,
    default: 2,
  },
  websocketMonitoring: {
    type: Boolean,
    default: true,
  },
  lastCacheClearedAt: {
    type: Date,
    default: null,
  },
  clientApprovalBackfilledAt: {
    type: Date,
    default: null,
  },
  lastExportedAt: {
    type: Date,
    default: null,
  },
  lastSecurityAuditAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Settings should be a singleton collection
settingsSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Settings", settingsSchema);
