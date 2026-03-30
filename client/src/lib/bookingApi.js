import api from "./api";

export const createBooking = (payload) =>
  api.post("/api/bookings", payload);

export const fetchMyBookings = (params) =>
  api.get("/api/bookings", { params });

