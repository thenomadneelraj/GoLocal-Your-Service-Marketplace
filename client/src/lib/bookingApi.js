import api from "./api";

export const createBookingDraft = (payload) => api.post("/bookings", payload);
export const createCheckoutDraft = (payload) => api.post("/bookings/draft", payload);

export const confirmBookingPayment = (bookingId, payload) =>
  api.patch(`/bookings/${bookingId}/payment`, payload);
export const confirmCheckoutBooking = (payload) =>
  api.post("/bookings/confirm", payload);

export const fetchBookingById = (bookingId) =>
  api.get(`/bookings/${bookingId}`);

export const fetchMyBookings = (params) => api.get("/bookings", { params });
export const createBookingTransaction = (payload) =>
  api.post("/transactions/create", payload);
