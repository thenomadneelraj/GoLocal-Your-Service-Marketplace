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

export const fetchAdminDashboard = () => api.get("/api/admin/dashboard");

export const fetchAdminUsers = (params = {}) =>
  api.get(`/api/admin/users${buildQuery(params)}`);

export const updateAdminUserStatus = (id, payload) =>
  api.patch(`/api/admin/users/${id}/status`, payload);

export const updateAdminUserVerification = (id, payload) =>
  api.patch(`/api/admin/users/${id}/verification`, payload);

export const fetchAdminVerificationRequests = (params = {}) =>
  api.get(`/api/admin/verification-requests${buildQuery(params)}`);

export const fetchAdminVerificationRequest = (id) =>
  api.get(`/api/admin/verification-requests/${id}`);

export const updateAdminVerificationRequest = (id, payload) =>
  api.patch(`/api/admin/verification-requests/${id}`, payload);

export const fetchAdminBookings = (params = {}) =>
  api.get(`/api/admin/bookings${buildQuery(params)}`);

export const fetchAdminBookingsSummary = () =>
  api.get("/api/admin/bookings/summary");

export const fetchAdminTransactions = (params = {}) =>
  api.get(`/api/admin/transactions${buildQuery(params)}`);

export const fetchAdminTransactionsSummary = () =>
  api.get("/api/admin/transactions/summary");

export const fetchAdminDisputes = (params = {}) =>
  api.get(`/api/admin/disputes${buildQuery(params)}`);

export const fetchAdminDisputesSummary = () =>
  api.get("/api/admin/disputes/summary");

export const updateAdminDisputeStatus = (id, payload) =>
  api.patch(`/api/admin/disputes/${id}/status`, payload);

export const fetchAdminContactMessages = (params = {}) =>
  api.get(`/api/admin/contact-messages${buildQuery(params)}`);

export const fetchAdminSettings = () => api.get("/api/admin/settings");

export const updateAdminSettings = (payload) =>
  api.put("/api/admin/settings", payload);

export const fetchPlatformSettings = fetchAdminSettings;

export const updatePlatformSettings = updateAdminSettings;

export const fetchPublicSettings = () => api.get("/api/public/settings");

export const fetchAdminAdvancedSettings = () =>
  api.get("/api/admin/settings/advanced");

export const updateAdminAdvancedSettings = (payload) =>
  api.put("/api/admin/settings/advanced", payload);

export const fetchAdminCacheSettings = () =>
  api.get("/api/admin/settings/cache");

export const refreshAdminCache = () =>
  api.post("/api/admin/settings/cache/refresh");

export const clearAdminCache = () =>
  api.post("/api/admin/settings/cache/clear");

export const fetchAdminExportSettings = () =>
  api.get("/api/admin/settings/export");

export const downloadAdminExport = (payload) =>
  api.post("/api/admin/settings/export", payload, {
    responseType: "blob",
  });

export const fetchAdminSecuritySettings = () =>
  api.get("/api/admin/settings/security");

export const runAdminSecurityAudit = () =>
  api.post("/api/admin/settings/security/audit-snapshot");

export const submitContactMessage = (payload) =>
  api.post("/api/contact-messages", payload);
