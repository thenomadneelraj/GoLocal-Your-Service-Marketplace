/**
 * Optimized admin API with client-side caching
 * Reduces redundant API calls and improves perceived performance
 */

import api from "./api";
import dataCache, { cacheKeys, invalidateCache } from "./dataCache";

const CACHE_TTL = {
  dashboard: 30000, // 30 seconds
  users: 60000, // 1 minute
  bookings: 30000, // 30 seconds
  disputes: 30000, // 30 seconds
  contactMessages: 60000, // 1 minute
  settings: 120000, // 2 minutes
};

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

// Dashboard
export const fetchAdminDashboard = async (forceRefresh = false) => {
  const key = cacheKeys.dashboard();
  const fetchFn = () => api.get("/admin/dashboard");
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.dashboard, forceRefresh);
};

// Users
export const fetchAdminUsers = async (params = {}, forceRefresh = false) => {
  const key = cacheKeys.users(params);
  const fetchFn = () => api.get(`/admin/users${buildQuery(params)}`);
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.users, forceRefresh);
};

export const updateAdminUserStatus = async (id, payload) => {
  const response = await api.patch(`/admin/users/${id}/status`, payload);
  // Invalidate users cache after update
  invalidateCache.users();
  return response;
};

export const updateAdminUserVerification = async (id, payload) => {
  const response = await api.patch(`/admin/users/${id}/verification`, payload);
  invalidateCache.users();
  return response;
};

// Verification Requests
export const fetchAdminVerificationRequests = async (
  params = {},
  forceRefresh = false,
) => {
  const key = cacheKeys.users({ ...params, verification: true });
  const fetchFn = () =>
    api.get(`/admin/verification-requests${buildQuery(params)}`);
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.users, forceRefresh);
};

export const fetchAdminVerificationRequest = async (id) => {
  return api.get(`/admin/verification-requests/${id}`);
};

export const updateAdminVerificationRequest = async (id, payload) => {
  const response = await api.patch(
    `/admin/verification-requests/${id}`,
    payload,
  );
  invalidateCache.verificationRequests();
  return response;
};

// Bookings
export const fetchAdminBookings = async (params = {}, forceRefresh = false) => {
  const key = cacheKeys.bookings(params);
  const fetchFn = () => api.get(`/admin/bookings${buildQuery(params)}`);
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.bookings, forceRefresh);
};

export const fetchAdminBookingsSummary = async (forceRefresh = false) => {
  const key = cacheKeys.bookingsSummary();
  const fetchFn = () => api.get("/admin/bookings/summary");
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.bookings, forceRefresh);
};

// Transactions
export const fetchAdminTransactions = async (
  params = {},
  forceRefresh = false,
) => {
  const key = cacheKeys.bookings({ ...params, type: "transactions" });
  const fetchFn = () => api.get(`/admin/transactions${buildQuery(params)}`);
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.bookings, forceRefresh);
};

export const fetchAdminTransactionsSummary = async (forceRefresh = false) => {
  const key = cacheKeys.bookings({ type: "transactionsSummary" });
  const fetchFn = () => api.get("/admin/transactions/summary");
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.bookings, forceRefresh);
};

// Disputes
export const fetchAdminDisputes = async (params = {}, forceRefresh = false) => {
  const key = cacheKeys.disputes(params);
  const fetchFn = () => api.get(`/admin/disputes${buildQuery(params)}`);
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.disputes, forceRefresh);
};

export const fetchAdminDisputesSummary = async (forceRefresh = false) => {
  const key = cacheKeys.disputesSummary();
  const fetchFn = () => api.get("/admin/disputes/summary");
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.disputes, forceRefresh);
};

export const updateAdminDisputeStatus = async (id, payload) => {
  const response = await api.patch(`/admin/disputes/${id}/status`, payload);
  invalidateCache.disputes();
  return response;
};

// Contact Messages
export const fetchAdminContactMessages = async (
  params = {},
  forceRefresh = false,
) => {
  const key = cacheKeys.contactMessages(params);
  const fetchFn = () => api.get(`/admin/contact-messages${buildQuery(params)}`);
  return dataCache.getOrFetch(
    key,
    fetchFn,
    CACHE_TTL.contactMessages,
    forceRefresh,
  );
};

// Settings
export const fetchAdminSettings = async (forceRefresh = false) => {
  const key = cacheKeys.settings();
  const fetchFn = () => api.get("/admin/settings");
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.settings, forceRefresh);
};

export const updateAdminSettings = async (payload) => {
  const response = await api.put("/admin/settings", payload);
  invalidateCache.settings();
  return response;
};

// Aliases for compatibility
export const fetchPlatformSettings = fetchAdminSettings;
export const updatePlatformSettings = updateAdminSettings;
export const fetchPublicSettings = () => api.get("/public/settings");
export const fetchAdminAdvancedSettings = async (forceRefresh = false) => {
  const key = "admin:settings:advanced";
  const fetchFn = () => api.get("/admin/settings/advanced");
  return dataCache.getOrFetch(key, fetchFn, CACHE_TTL.settings, forceRefresh);
};
export const updateAdminAdvancedSettings = async (payload) => {
  const response = await api.put("/admin/settings/advanced", payload);
  invalidateCache.settings();
  return response;
};

// Export - Admin Export/Download (not cached, direct API call)
export const downloadAdminExport = (payload) =>
  api.post("/admin/settings/export", payload, {
    responseType: "blob",
  });

// Cache management
export const refreshAdminCache = () => invalidateCache.all();
export const clearAdminCache = () => dataCache.clear();

export { dataCache, invalidateCache };

// Export the original API for endpoints that shouldn't be cached
export default api;
