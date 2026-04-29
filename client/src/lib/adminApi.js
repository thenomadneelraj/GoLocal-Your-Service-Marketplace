import api from "./api";

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
};

export const fetchAdminDashboard = () => api.get("/admin/dashboard");

export const fetchAdminUsers = (params = {}) =>
  api.get(`/admin/users${buildQuery(params)}`);

export const updateAdminUserStatus = (id, payload) =>
  api.patch(`/admin/users/${id}/status`, payload);

export const updateAdminUserVerification = (id, payload) =>
  api.patch(`/admin/users/${id}/verification`, payload);

export const fetchAdminVerificationRequests = (params = {}) =>
  api.get(`/admin/verification-requests${buildQuery(params)}`);

export const fetchAdminVerificationRequest = (id) =>
  api.get(`/admin/verification-requests/${id}`);

export const updateAdminVerificationRequest = (id, payload) =>
  api.patch(`/admin/verification-requests/${id}`, payload);

export const fetchAdminBookings = (params = {}) =>
  api.get(`/admin/bookings${buildQuery(params)}`);

export const fetchAdminBookingsSummary = () =>
  api.get("/admin/bookings/summary");

export const fetchAdminTransactions = (params = {}) =>
  api.get(`/admin/transactions${buildQuery(params)}`);

export const fetchAdminTransactionsSummary = () =>
  api.get("/admin/transactions/summary");

export const fetchAdminDisputes = (params = {}) =>
  api.get(`/admin/disputes${buildQuery(params)}`);

export const fetchAdminDisputesSummary = () =>
  api.get("/admin/disputes/summary");

export const updateAdminDisputeStatus = (id, payload) =>
  api.patch(`/admin/disputes/${id}/status`, payload);

export const fetchAdminContactMessages = (params = {}) =>
  api.get(`/admin/contact-messages${buildQuery(params)}`);

export const fetchAdminSettings = () => api.get("/admin/settings");

export const updateAdminSettings = (payload) =>
  api.put("/admin/settings", payload);

export const fetchPlatformSettings = fetchAdminSettings;

export const updatePlatformSettings = updateAdminSettings;

export const fetchPublicSettings = () => api.get("/public/settings");

export const fetchAdminAdvancedSettings = () =>
  api.get("/admin/settings/advanced");

export const updateAdminAdvancedSettings = (payload) =>
  api.put("/admin/settings/advanced", payload);

export const fetchAdminCacheSettings = () => api.get("/admin/settings/cache");

export const refreshAdminCache = () =>
  api.post("/admin/settings/cache/refresh");

export const clearAdminCache = () => api.post("/admin/settings/cache/clear");

export const fetchAdminExportSettings = () => api.get("/admin/settings/export");

export const downloadAdminExport = (payload) =>
  api.post("/admin/settings/export", payload, {
    responseType: "blob",
  });

export const fetchAdminSecuritySettings = () =>
  api.get("/admin/settings/security");

export const runAdminSecurityAudit = () =>
  api.post("/admin/settings/security/audit-snapshot");

export const submitContactMessage = (payload) =>
  api.post("/contact-messages", payload);
