import api from "./api";

export const createBookingDraft = (payload) => api.post("/api/bookings", payload);

export const confirmBookingPayment = (bookingId, payload) =>
  api.patch(`/api/bookings/${bookingId}/payment`, payload);

export const fetchBookingById = (bookingId) => api.get(`/api/bookings/${bookingId}`);

export const fetchMyBookings = (params) => api.get("/api/bookings", { params });

