const {
  APPROVAL_STATUS,
  buildPersistedAccountState,
  isApprovalRequiredRole,
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
      pendingApproval: false,
      reason: null,
      message: "",
      canCreateBookings: true,
      canRespondToBookings: true,
    };
  }

  const requiresApproval = isApprovalRequiredRole(role);
  const pendingApproval =
    requiresApproval && baseState.approvalStatus === APPROVAL_STATUS.PENDING;
  const approvalRejected =
    requiresApproval && baseState.approvalStatus === APPROVAL_STATUS.REJECTED;
  const isApproved =
    !requiresApproval || baseState.approvalStatus === APPROVAL_STATUS.APPROVED;

  if (!baseState.isActive) {
    return {
      role,
      status: baseState.status,
      approvalStatus: baseState.approvalStatus,
      isActive: false,
      isApproved,
      restricted: true,
      pendingApproval: false,
      reason: role === "PROVIDER" ? "provider_disabled" : "client_suspended",
      message:
        role === "PROVIDER"
          ? "Your provider account is disabled. You can access only your dashboard to contact the admin."
          : "Your client account is suspended. You can access only your dashboard to contact the admin.",
      canCreateBookings: false,
      canRespondToBookings: false,
    };
  }

  if (approvalRejected) {
    return {
      role,
      status: baseState.status,
      approvalStatus: baseState.approvalStatus,
      isActive: true,
      isApproved: false,
      restricted: true,
      pendingApproval: false,
      reason: role === "PROVIDER" ? "provider_rejected" : "client_rejected",
      message:
        role === "PROVIDER"
          ? "Your provider account was rejected by admin. Please contact support for next steps."
          : "Your client account was rejected by admin. Please contact support for next steps.",
      canCreateBookings: false,
      canRespondToBookings: false,
    };
  }

  return {
    role,
    status: baseState.status,
    approvalStatus: baseState.approvalStatus,
    isActive: true,
    isApproved,
    restricted: false,
    pendingApproval,
    reason: null,
    message: "",
    canCreateBookings: role === "CLIENT" ? isApproved : true,
    canRespondToBookings: role === "PROVIDER" ? isApproved : true,
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
      pendingApproval: Boolean(accessState.pendingApproval),
      restricted: true,
      canCreateBookings: Boolean(accessState.canCreateBookings),
      canRespondToBookings: Boolean(accessState.canRespondToBookings),
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
