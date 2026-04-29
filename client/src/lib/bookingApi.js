import api from "./api";

export const createBookingDraft = (payload) => api.post("/bookings", payload);

export const confirmBookingPayment = (bookingId, payload) =>
  api.patch(`/bookings/${bookingId}/payment`, payload);

export const fetchBookingById = (bookingId) =>
  api.get(`/bookings/${bookingId}`);

export const fetchMyBookings = (params) => api.get("/bookings", { params });
