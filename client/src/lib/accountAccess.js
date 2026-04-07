const normalizeUserStatus = (value = "", fallbackIsActive = true) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["active", "suspended", "rejected"].includes(normalized)) {
    return normalized;
  }
  return fallbackIsActive === false ? "suspended" : "active";
};

const normalizeApprovalStatus = (value = "", role = "", legacyApproved = true) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "approved", "rejected"].includes(normalized)) {
    return normalized;
  }

  return String(role || "").toUpperCase() === "PROVIDER"
    ? legacyApproved
      ? "approved"
      : "pending"
    : "approved";
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
    user?.isApproved !== false
  );
  const isActive = status === "active";
  const isApproved =
    role === "PROVIDER" ? approvalStatus === "approved" : true;

  if (role === "CLIENT" && !isActive) {
    return {
      role,
      restricted: true,
      title: "Client account suspended",
      description:
        "Your client account is currently suspended by admin. You can access only this dashboard and should contact the admin to reactivate your account.",
    };
  }

  if (role === "PROVIDER" && !isActive) {
    return {
      role,
      restricted: true,
      title: "Provider account disabled",
      description:
        "Your provider account is currently disabled by admin. You can access only this dashboard and should contact the admin to restore access.",
    };
  }

  if (role === "PROVIDER" && !isApproved) {
    return {
      role,
      restricted: true,
      title:
        approvalStatus === "rejected"
          ? "Provider account rejected"
          : "Provider approval pending",
      description:
        approvalStatus === "rejected"
          ? "Your provider account was rejected by admin. You can access only this dashboard and should contact the admin for next steps."
          : "Your provider account is waiting for admin approval. You can access only this dashboard and should contact the admin for activation.",
    };
  }

  return {
    role,
    restricted: false,
    title: "",
    description: "",
  };
};

export const isRestrictedRouteAllowed = (user, pathname = "") => {
  const access = getAccountAccessState(user);
  if (!access.restricted) return true;

  return pathname === getDashboardPathByRole(access.role);
};
