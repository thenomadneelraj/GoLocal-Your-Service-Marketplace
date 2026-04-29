const normalizeUserStatus = (value = "", fallbackIsActive = true) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["pending", "approved", "suspended", "rejected"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "active") {
    return "approved";
  }
  return fallbackIsActive === false ? "suspended" : "pending";
};

const normalizeApprovalStatus = (
  value = "",
  role = "",
  legacyApproved = true,
) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["pending", "approved", "rejected"].includes(normalized)) {
    return normalized;
  }

  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "ADMIN") {
    return "approved";
  }

  if (["CLIENT", "PROVIDER"].includes(normalizedRole)) {
    return legacyApproved ? "approved" : "pending";
  }

  return "approved";
};

export const getDashboardPathByRole = (role) => {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "PROVIDER") return "/provider-dashboard";
  if (normalizedRole === "ADMIN") return "/admin";
  return "/dashboard";
};

export const getAccountAccessState = (user) => {
  const role = String(user?.role || "").toUpperCase();
  const status = normalizeUserStatus(user?.status, user?.isActive);
  const approvalStatus = normalizeApprovalStatus(
    user?.approvalStatus,
    role,
    user?.isApproved !== false,
  );
  const isActive = status === "approved";
  const approvalRequired = role === "CLIENT" || role === "PROVIDER";
  const pendingApproval = approvalRequired && status === "pending";
  const approvalRejected = approvalRequired && status === "rejected";
  const isApproved = !approvalRequired || status === "approved";

  if (role === "ADMIN") {
    return {
      role,
      restricted: false,
      pendingApproval: false,
      approvalRejected: false,
      isApproved: true,
      canCreateBookings: true,
      canRespondToBookings: true,
      title: "",
      description: "",
    };
  }

  if (role === "CLIENT" && !isActive) {
    return {
      role,
      restricted: false,
      pendingApproval: false,
      approvalRejected: false,
      isApproved,
      canCreateBookings: false,
      canRespondToBookings: false,
      title: "Client account suspended",
      description: "Your account is suspended.",
    };
  }

  if (role === "PROVIDER" && !isActive) {
    return {
      role,
      restricted: false,
      pendingApproval: false,
      approvalRejected: false,
      isApproved,
      canCreateBookings: false,
      canRespondToBookings: false,
      title: "Provider account suspended",
      description: "Your provider account is suspended.",
    };
  }

  if (approvalRejected) {
    return {
      role,
      restricted: true,
      pendingApproval: false,
      approvalRejected: true,
      isApproved: false,
      canCreateBookings: false,
      canRespondToBookings: false,
      title:
        role === "PROVIDER"
          ? "Provider account rejected"
          : "Client account rejected",
      description:
        role === "PROVIDER"
          ? "Your provider account was rejected by admin. Contact the admin for next steps."
          : "Your client account was rejected by admin. Contact the admin for next steps.",
    };
  }

  if (role === "CLIENT" && pendingApproval) {
    return {
      role,
      restricted: false,
      pendingApproval: true,
      approvalRejected: false,
      isApproved: false,
      canCreateBookings: false,
      canRespondToBookings: false,
      title: "Account approval pending.",
      description:
        "Your account is awaiting admin approval before booking providers.",
    };
  }

  if (role === "PROVIDER" && pendingApproval) {
    return {
      role,
      restricted: false,
      pendingApproval: true,
      approvalRejected: false,
      isApproved: false,
      canCreateBookings: true,
      canRespondToBookings: false,
      title: "Account Approval Pending",
      description:
        "Your provider account is awaiting admin approval.",
    };
  }

  return {
    role,
    restricted: false,
    pendingApproval: false,
    approvalRejected: false,
    isApproved,
    canCreateBookings: role === "CLIENT" ? true : false,
    canRespondToBookings: role === "PROVIDER" ? true : false,
    title: "",
    description: "",
  };
};

export const isRestrictedRouteAllowed = (user, pathname = "") => {
  const access = getAccountAccessState(user);
  if (!access.restricted) return true;

  const normalizedPath = String(pathname || "").trim();
  const normalizedRole = String(access.role || "").toUpperCase();

  if (normalizedRole === "PROVIDER") {
    return [
      "/provider-dashboard",
      "/provider/settings",
      "/provider/profile",
      "/provider/verification",
      "/provider/help-support",
    ].includes(normalizedPath);
  }

  return normalizedPath === getDashboardPathByRole(access.role);
};
