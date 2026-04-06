const BOOKING_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const LEGACY_BOOKING_STATUS_ALIASES = {
  confirmed: BOOKING_STATUS.ACCEPTED,
};

const BOOKING_STATUS_VALUES = Object.values(BOOKING_STATUS);

const normalizeBookingStatus = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return LEGACY_BOOKING_STATUS_ALIASES[normalized] || normalized;
};

const toBookingPersistenceStatus = (value = "") => {
  const normalized = normalizeBookingStatus(value);
  return BOOKING_STATUS_VALUES.includes(normalized)
    ? normalized
    : BOOKING_STATUS.PENDING;
};

const isPendingBooking = (value = "") =>
  normalizeBookingStatus(value) === BOOKING_STATUS.PENDING;

const isAcceptedBooking = (value = "") =>
  normalizeBookingStatus(value) === BOOKING_STATUS.ACCEPTED;

const isRejectedBooking = (value = "") =>
  normalizeBookingStatus(value) === BOOKING_STATUS.REJECTED;

const isCompletedBooking = (value = "") =>
  normalizeBookingStatus(value) === BOOKING_STATUS.COMPLETED;

const isCancelledBooking = (value = "") =>
  normalizeBookingStatus(value) === BOOKING_STATUS.CANCELLED;

const isOpenBooking = (value = "") =>
  [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED].includes(
    normalizeBookingStatus(value)
  );

module.exports = {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  LEGACY_BOOKING_STATUS_ALIASES,
  normalizeBookingStatus,
  toBookingPersistenceStatus,
  isPendingBooking,
  isAcceptedBooking,
  isRejectedBooking,
  isCompletedBooking,
  isCancelledBooking,
  isOpenBooking,
};
