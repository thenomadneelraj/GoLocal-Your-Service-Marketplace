import api from "./api";

// Small helper to build query strings from objects
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

// 1️⃣ Service Catalog
export const fetchServices = (params) =>
  api.get(`/api/admin/services${buildQuery(params)}`);

export const createService = (payload) =>
  api.post("/api/admin/services", payload);

export const updateService = (id, payload) =>
  api.put(`/api/admin/services/${id}`, payload);

export const deleteService = (id) =>
  api.delete(`/api/admin/services/${id}`);

export const toggleServiceStatus = (id) =>
  api.post(`/api/admin/services/${id}/toggle`);

export const assignProviderToService = (id, providerId) =>
  api.post(`/api/admin/services/${id}/assign-provider`, { providerId });

// 2️⃣ Transactions
export const fetchTransactions = (params) =>
  api.get(`/api/admin/transactions${buildQuery(params)}`);

// 3️⃣ Payouts
export const fetchPayouts = (params) =>
  api.get(`/api/admin/payouts${buildQuery(params)}`);

export const markPayoutPaid = (id) =>
  api.post(`/api/admin/payouts/${id}/mark-paid`);

// 4️⃣ Ratings & Reviews
export const fetchReviews = (params) =>
  api.get(`/api/admin/reviews${buildQuery(params)}`);

export const deleteReview = (id) =>
  api.delete(`/api/admin/reviews/${id}`);

export const flagReview = (id, flaggedReason) =>
  api.post(`/api/admin/reviews/${id}/flag`, { flaggedReason });

// 5️⃣ Disputes
export const fetchDisputes = (params) =>
  api.get(`/api/admin/disputes${buildQuery(params)}`);

export const createDispute = (payload) =>
  api.post("/api/admin/disputes", payload);

export const updateDisputeStatus = (id, payload) =>
  api.put(`/api/admin/disputes/${id}/status`, payload);

// 6️⃣ Platform Settings
export const fetchPlatformSettings = () =>
  api.get("/api/admin/settings");

export const updatePlatformSettings = (payload) =>
  api.put("/api/admin/settings", payload);

// 7️⃣ Security
export const fetchLoginHistory = (params) =>
  api.get(`/api/admin/security/login-history${buildQuery(params)}`);

export const fetchActivityLogs = (params) =>
  api.get(`/api/admin/security/activity-logs${buildQuery(params)}`);

