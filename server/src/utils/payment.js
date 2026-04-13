const sanitizePhone = (value = "") =>
  String(value || "")
    .replace(/\D/g, "")
    .trim();

const normalizeBankName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const sanitizeAccountNumber = (value = "") =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim();

const generateUpiId = ({ phone = "", bankName = "" } = {}) => {
  const normalizedPhone = sanitizePhone(phone);
  const normalizedBank = normalizeBankName(bankName);

  if (!normalizedPhone || !normalizedBank) {
    return "";
  }

  return `${normalizedPhone}@${normalizedBank}`;
};

const roundCurrency = (value = 0) =>
  Number(Number(value || 0).toFixed(2));

const calculateTransactionBreakdown = ({
  baseAmount = 0,
  commissionPercentage = 5,
} = {}) => {
  const normalizedBaseAmount = roundCurrency(baseAmount);
  const normalizedCommissionPercentage = Number(commissionPercentage || 0);
  const clientPlatformFee = roundCurrency(
    (normalizedBaseAmount * normalizedCommissionPercentage) / 100
  );
  const providerPlatformFee = roundCurrency(
    (normalizedBaseAmount * normalizedCommissionPercentage) / 100
  );
  const totalPaidByClient = roundCurrency(
    normalizedBaseAmount + clientPlatformFee
  );
  const netToProvider = roundCurrency(
    Math.max(0, normalizedBaseAmount - providerPlatformFee)
  );
  const platformRevenue = roundCurrency(
    clientPlatformFee + providerPlatformFee
  );

  return {
    baseAmount: normalizedBaseAmount,
    commissionPercentage: normalizedCommissionPercentage,
    clientPlatformFee,
    providerPlatformFee,
    totalPaidByClient,
    netToProvider,
    platformRevenue,
  };
};

const buildPaymentSnapshot = (user = {}) => ({
  userId: user?._id || user?.id || null,
  name: user?.name || "",
  phone: sanitizePhone(user?.phone || ""),
  bankName: String(user?.bankName || "").trim(),
  upiId: String(user?.upiId || "").trim(),
  accountNumber: sanitizeAccountNumber(user?.accountNumber || ""),
  accountHolderName: String(
    user?.accountHolderName || user?.name || ""
  ).trim(),
});

module.exports = {
  sanitizePhone,
  normalizeBankName,
  sanitizeAccountNumber,
  generateUpiId,
  roundCurrency,
  calculateTransactionBreakdown,
  buildPaymentSnapshot,
};
