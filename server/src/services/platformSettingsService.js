const User = require("../models/User");

const DEFAULT_PLATFORM_SETTINGS = {
  commissionPercentage: 5,
  currency: "INR",
  platformName: "GoLocal",
  supportEmail: "support@golocal.com",
  maintenanceMode: false,
  maintenanceMessage:
    "Website is currently under maintenance. Please check back soon.",
  controlDepth: "High",
  automationProfile: "Managed",
  reminderWindowLabel: "24h",
  exportRetentionDays: 30,
  manualProviderReview: true,
  disputeEscalationHours: 4,
  bookingReminderHours: 24,
  websocketMonitoring: true,
  lastCacheClearedAt: null,
  lastExportedAt: null,
  lastSecurityAuditAt: null,
};

const getPrimaryAdmin = async () =>
  User.findOne({ role: "admin" }).sort({ createdAt: 1 });

const mergePlatformSettings = (settings = {}) => ({
  ...DEFAULT_PLATFORM_SETTINGS,
  ...(settings || {}),
});

const getPlatformSettings = async () => {
  const admin = await getPrimaryAdmin();
  return mergePlatformSettings(admin?.platformSettings);
};

const updatePlatformSettings = async (updates = {}, adminUserId = "") => {
  const targetFilter = adminUserId
    ? { _id: adminUserId, role: "admin" }
    : { role: "admin" };

  const admin = await User.findOne(targetFilter);
  if (!admin) {
    throw new Error("Admin account not found.");
  }

  admin.platformSettings = {
    ...(admin.platformSettings?.toObject
      ? admin.platformSettings.toObject()
      : admin.platformSettings || {}),
    ...updates,
  };

  await admin.save();

  return mergePlatformSettings(admin.platformSettings);
};

module.exports = {
  DEFAULT_PLATFORM_SETTINGS,
  getPrimaryAdmin,
  getPlatformSettings,
  updatePlatformSettings,
  mergePlatformSettings,
};
