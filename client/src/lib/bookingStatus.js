export const BOOKING_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const LEGACY_BOOKING_STATUS_ALIASES = {
  confirmed: BOOKING_STATUS.ACCEPTED,
};

export const normalizeBookingStatus = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return LEGACY_BOOKING_STATUS_ALIASES[normalized] || normalized;
};

export const isAcceptedBooking = (value = "") =>
  normalizeBookingStatus(value) === BOOKING_STATUS.ACCEPTED;

export const isOpenBooking = (value = "") =>
  [
    BOOKING_STATUS.PENDING_PAYMENT,
    BOOKING_STATUS.PENDING,
    BOOKING_STATUS.ACCEPTED,
  ].includes(
    normalizeBookingStatus(value)
  );

export const getBookingStatusLabel = (value = "") => {
  const normalized = normalizeBookingStatus(value);
  if (!normalized) {
    return "unknown";
  }
  if (normalized === BOOKING_STATUS.PENDING_PAYMENT) {
    return "Pending Payment";
  }
  return normalized.replace(/^\w/, (letter) => letter.toUpperCase());
};
