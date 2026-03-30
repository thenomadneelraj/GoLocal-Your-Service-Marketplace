export const getDashboardPathByRole = (role) => {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "PROVIDER") return "/provider-dashboard";
  if (normalizedRole === "ADMIN") return "/admin-dashboard";
  return "/dashboard";
};

export const getAccountAccessState = (user) => {
  const role = String(user?.role || "").toUpperCase();
  const isActive = user?.isActive !== false;
  const isApproved =
    role === "PROVIDER" ? user?.isApproved !== false : true;

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
      title: "Provider approval pending",
      description:
        "Your provider account is waiting for admin approval. You can access only this dashboard and should contact the admin for activation.",
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
