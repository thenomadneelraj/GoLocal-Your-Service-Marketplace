const USER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
};

const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const USER_STATUS_VALUES = Object.values(USER_STATUS);
const APPROVAL_STATUS_VALUES = Object.values(APPROVAL_STATUS);

const isApprovalRequiredRole = (role = "") =>
  ["client", "provider"].includes(String(role || "").trim().toLowerCase());

const normalizeUserStatus = (value, fallbackIsActive = true) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (USER_STATUS_VALUES.includes(normalized)) {
    return normalized;
  }

  if (normalized === "active") {
    return USER_STATUS.APPROVED;
  }

  return fallbackIsActive === false
    ? USER_STATUS.SUSPENDED
    : USER_STATUS.PENDING;
};

const normalizeApprovalStatus = (
  value,
  { role = "", status = USER_STATUS.PENDING, isApproved } = {}
) => {
  const normalized = String(value || "").trim().toLowerCase();
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "admin") {
    return APPROVAL_STATUS.APPROVED;
  }

  if (status === USER_STATUS.REJECTED) {
    return APPROVAL_STATUS.REJECTED;
  }

  if (status === USER_STATUS.APPROVED) {
    return APPROVAL_STATUS.APPROVED;
  }

  if (status === USER_STATUS.PENDING) {
    return APPROVAL_STATUS.PENDING;
  }

  if (status === USER_STATUS.SUSPENDED) {
    return APPROVAL_STATUS.PENDING;
  }

  if (APPROVAL_STATUS_VALUES.includes(normalized)) {
    return normalized;
  }

  if (!isApprovalRequiredRole(normalizedRole)) {
    return APPROVAL_STATUS.APPROVED;
  }

  if (isApproved === true) {
    return APPROVAL_STATUS.APPROVED;
  }

  return APPROVAL_STATUS.PENDING;
};

const buildPersistedAccountState = ({
  role = "",
  status,
  isActive,
  approvalStatus,
  isApproved,
} = {}) => {
  const normalizedStatus = normalizeUserStatus(status, isActive);
  const normalizedApprovalStatus = normalizeApprovalStatus(approvalStatus, {
    role,
    status: normalizedStatus,
    isApproved,
  });

  return {
    status: normalizedStatus,
    isActive: normalizedStatus === USER_STATUS.APPROVED,
    approvalStatus: normalizedApprovalStatus,
  };
};

const isAccountActive = (account = {}) =>
  normalizeUserStatus(account.status, account.isActive) === USER_STATUS.APPROVED;

const isProviderApproved = ({ user, provider } = {}) =>
  normalizeApprovalStatus(user?.approvalStatus, {
    role: user?.role || "provider",
    status: normalizeUserStatus(user?.status, user?.isActive),
    isApproved: provider?.isApproved,
  }) === APPROVAL_STATUS.APPROVED;

const isUserApproved = (user = {}) =>
  !isApprovalRequiredRole(user?.role) ||
  normalizeUserStatus(user?.status, user?.isActive) === USER_STATUS.APPROVED;

const canBook = (user = {}) =>
  String(user?.role || "").trim().toLowerCase() === "client" &&
  normalizeUserStatus(user?.status, user?.isActive) === USER_STATUS.APPROVED;

const canAcceptBookings = (user = {}) =>
  String(user?.role || "").trim().toLowerCase() === "provider" &&
  normalizeUserStatus(user?.status, user?.isActive) === USER_STATUS.APPROVED;

const getAccountStatusMessage = (user = {}) => {
  const role = String(user?.role || "").trim().toLowerCase();
  const status = normalizeUserStatus(user?.status, user?.isActive);

  if (role === "client" && status === USER_STATUS.PENDING) {
    return "Your account is awaiting admin approval before booking providers.";
  }
  if (role === "client" && status === USER_STATUS.SUSPENDED) {
    return "Your account is suspended.";
  }
  if (role === "provider" && status === USER_STATUS.PENDING) {
    return "Your provider account is awaiting admin approval.";
  }
  if (role === "provider" && status === USER_STATUS.SUSPENDED) {
    return "Your provider account is suspended.";
  }

  return "Your account does not have permission for this action.";
};

module.exports = {
  USER_STATUS,
  USER_STATUS_VALUES,
  APPROVAL_STATUS,
  APPROVAL_STATUS_VALUES,
  isApprovalRequiredRole,
  normalizeUserStatus,
  normalizeApprovalStatus,
  buildPersistedAccountState,
  isAccountActive,
  isProviderApproved,
  isUserApproved,
  canBook,
  canAcceptBookings,
  getAccountStatusMessage,
};
