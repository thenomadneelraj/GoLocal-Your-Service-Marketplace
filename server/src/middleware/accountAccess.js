const Provider = require("../models/Provider");

const buildAccountAccessState = async (user) => {
  const role = String(user?.role || "").toUpperCase();

  if (!user || role === "ADMIN") {
    return {
      role,
      isActive: true,
      isApproved: true,
      restricted: false,
      reason: null,
      message: "",
    };
  }

  if (user.isActive === false) {
    return {
      role,
      isActive: false,
      isApproved: true,
      restricted: true,
      reason: role === "PROVIDER" ? "provider_disabled" : "client_suspended",
      message:
        role === "PROVIDER"
          ? "Your provider account is disabled. You can access only your dashboard to contact the admin."
          : "Your client account is suspended. You can access only your dashboard to contact the admin.",
    };
  }

  if (role === "PROVIDER") {
    const provider = await Provider.findOne({ userId: user._id })
      .select("isApproved")
      .lean();

    if (!provider?.isApproved) {
      return {
        role,
        isActive: true,
        isApproved: false,
        restricted: true,
        reason: "provider_unapproved",
        message:
          "Your provider account is awaiting admin approval. You can access only your dashboard to contact the admin.",
      };
    }
  }

  return {
    role,
    isActive: true,
    isApproved: true,
    restricted: false,
    reason: null,
    message: "",
  };
};

const buildAccountRestrictionResponse = (accessState = {}) => ({
  success: false,
  code: "ACCOUNT_RESTRICTED",
  message:
    accessState.message ||
    "Your account has limited access right now. Please contact the admin.",
  data: {
    role: accessState.role || "",
    reason: accessState.reason || null,
    isActive: accessState.isActive !== false,
    isApproved: accessState.isApproved !== false,
    restricted: true,
  },
});

const attachAccountAccessState = async (req, res, next) => {
  try {
    req.accountAccess = await buildAccountAccessState(req.user);
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to verify account access.",
    });
  }
};

const enforceAccountAccess = async (req, res, next) => {
  try {
    const accessState =
      req.accountAccess || (await buildAccountAccessState(req.user));

    req.accountAccess = accessState;

    if (!accessState.restricted) {
      return next();
    }

    return res.status(403).json(buildAccountRestrictionResponse(accessState));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to verify account access.",
    });
  }
};

module.exports = {
  attachAccountAccessState,
  buildAccountAccessState,
  buildAccountRestrictionResponse,
  enforceAccountAccess,
};
