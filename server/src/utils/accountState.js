const USER_STATUS = {
  ACTIVE: "active",
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

  return fallbackIsActive === false
    ? USER_STATUS.SUSPENDED
    : USER_STATUS.ACTIVE;
};

const normalizeApprovalStatus = (
  value,
  { role = "", status = USER_STATUS.ACTIVE, isApproved } = {}
) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (APPROVAL_STATUS_VALUES.includes(normalized)) {
    return normalized;
  }

  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "admin") {
    return APPROVAL_STATUS.APPROVED;
  }

  if (status === USER_STATUS.REJECTED) {
    return APPROVAL_STATUS.REJECTED;
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
    isActive: normalizedStatus === USER_STATUS.ACTIVE,
    approvalStatus: normalizedApprovalStatus,
  };
};

const isAccountActive = (account = {}) =>
  normalizeUserStatus(account.status, account.isActive) === USER_STATUS.ACTIVE;

const isProviderApproved = ({ user, provider } = {}) =>
  normalizeApprovalStatus(user?.approvalStatus, {
    role: user?.role || "provider",
    status: normalizeUserStatus(user?.status, user?.isActive),
    isApproved: provider?.isApproved,
  }) === APPROVAL_STATUS.APPROVED;

const isUserApproved = (user = {}) =>
  !isApprovalRequiredRole(user?.role) ||
  normalizeApprovalStatus(user?.approvalStatus, {
    role: user?.role,
    status: normalizeUserStatus(user?.status, user?.isActive),
    isApproved: user?.isApproved,
  }) === APPROVAL_STATUS.APPROVED;

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
};
