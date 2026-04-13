const TRANSACTION_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const LEGACY_TRANSACTION_STATUS_ALIASES = {
  success: TRANSACTION_STATUS.PAID,
  processing: TRANSACTION_STATUS.PENDING,
};

const TRANSACTION_STATUS_VALUES = Object.values(TRANSACTION_STATUS);

const normalizeTransactionStatus = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return LEGACY_TRANSACTION_STATUS_ALIASES[normalized] || normalized;
};

const toTransactionPersistenceStatus = (value = "") => {
  const normalized = normalizeTransactionStatus(value);
  return TRANSACTION_STATUS_VALUES.includes(normalized)
    ? normalized
    : TRANSACTION_STATUS.PENDING;
};

const isPaidTransaction = (value = "") =>
  normalizeTransactionStatus(value) === TRANSACTION_STATUS.PAID;

const isPendingTransaction = (value = "") =>
  normalizeTransactionStatus(value) === TRANSACTION_STATUS.PENDING;

module.exports = {
  TRANSACTION_STATUS,
  TRANSACTION_STATUS_VALUES,
  LEGACY_TRANSACTION_STATUS_ALIASES,
  normalizeTransactionStatus,
  toTransactionPersistenceStatus,
  isPaidTransaction,
  isPendingTransaction,
};
