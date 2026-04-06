const Provider = require("../models/Provider");
const {
  APPROVAL_STATUS,
  buildPersistedAccountState,
  normalizeApprovalStatus,
} = require("../utils/accountState");

const buildAccountAccessState = async (user) => {
  const role = String(user?.role || "").toUpperCase();
  const baseState = buildPersistedAccountState({
    role: user?.role,
    status: user?.status,
    isActive: user?.isActive,
    approvalStatus: user?.approvalStatus,
  });

  if (!user || role === "ADMIN") {
    return {
      role,
      status: baseState.status,
      approvalStatus: baseState.approvalStatus,
      isActive: true,
      isApproved: true,
      restricted: false,
      reason: null,
      message: "",
    };
  }

  if (!baseState.isActive) {
    return {
      role,
      status: baseState.status,
      approvalStatus: baseState.approvalStatus,
      isActive: false,
      isApproved: baseState.approvalStatus === APPROVAL_STATUS.APPROVED,
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
    const approvalStatus = normalizeApprovalStatus(
      user.approvalStatus,
      {
        role: user.role,
        status: baseState.status,
        isApproved: provider?.isApproved,
      }
    );

    if (approvalStatus !== APPROVAL_STATUS.APPROVED) {
      return {
        role,
        status: baseState.status,
        approvalStatus,
        isActive: true,
        isApproved: false,
        restricted: true,
        reason:
          approvalStatus === APPROVAL_STATUS.REJECTED
            ? "provider_rejected"
            : "provider_unapproved",
        message:
          approvalStatus === APPROVAL_STATUS.REJECTED
            ? "Your provider account was rejected by admin. You can access only your dashboard to contact the admin."
            : "Your provider account is awaiting admin approval. You can access only your dashboard to contact the admin.",
      };
    }
  }

  return {
    role,
    status: baseState.status,
    approvalStatus: baseState.approvalStatus,
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
      status: accessState.status || "",
      approvalStatus: accessState.approvalStatus || "",
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
