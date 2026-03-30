const PlatformSetting = require("../models/PlatformSetting");

const DEFAULT_PLATFORM_NAME = "GoLocal";
const DEFAULT_SUPPORT_EMAIL = "support@golocal.com";

const getPlatformStatus = async () => {
  const settings = await PlatformSetting.findOne()
    .select("maintenanceMode platformName supportEmail")
    .lean();

  return {
    maintenanceMode: Boolean(settings?.maintenanceMode),
    platformName: settings?.platformName || DEFAULT_PLATFORM_NAME,
    supportEmail: settings?.supportEmail || DEFAULT_SUPPORT_EMAIL,
  };
};

const buildMaintenanceResponse = (status = {}) => ({
  success: false,
  code: "MAINTENANCE_MODE",
  message: `${status.platformName || DEFAULT_PLATFORM_NAME} is temporarily under maintenance. Client and provider access is paused right now.`,
  data: {
    maintenanceMode: true,
    platformName: status.platformName || DEFAULT_PLATFORM_NAME,
    supportEmail: status.supportEmail || DEFAULT_SUPPORT_EMAIL,
  },
});

const enforceMaintenanceMode = async (req, res, next) => {
  try {
    if (String(req.user?.role || "").toUpperCase() === "ADMIN") {
      return next();
    }

    const status = await getPlatformStatus();
    if (!status.maintenanceMode) {
      return next();
    }

    return res.status(503).json(buildMaintenanceResponse(status));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to verify maintenance mode.",
    });
  }
};

module.exports = {
  buildMaintenanceResponse,
  enforceMaintenanceMode,
  getPlatformStatus,
};
