import { DATA_ORIGIN, withDataOrigin } from "./dataOrigin";

const normalizeRole = (role = "") => String(role || "").trim().toLowerCase();

const normalizeWorks = (source = {}) => {
  const works = source.works || source.services || source.selectedServices || [];
  return (Array.isArray(works) ? works : [])
    .map((work) => ({
      title: String(work?.title || work?.name || "").trim(),
      price: Number(work?.price || work?.amount || 0),
    }))
    .filter((work) => work.title);
};

export const normalizeUser = (user = {}, dataOrigin = user.dataOrigin || DATA_ORIGIN.REAL) =>
  withDataOrigin(
    {
      _id: user._id || user.id,
      role: normalizeRole(user.role),
      name: user.name || "",
      email: String(user.email || "").trim().toLowerCase(),
      phone: user.phone || "",
      isMock: Boolean(user.isMock),
      approvalStatus: String(user.approvalStatus || "pending").toLowerCase(),
      works: normalizeWorks(user),
      bankName: user.bankName || "",
      accountNumber: user.accountNumber || "",
      accountHolderName: user.accountHolderName || user.name || "",
      upiId: user.upiId || "",
      status: String(user.status || "active").toLowerCase(),
      joinedAt: user.joinedAt || user.createdAt || "",
      serviceType: user.serviceType || "",
      avatar: user.avatar || user.profileImage || "",
    },
    dataOrigin,
  );

export const normalizeBooking = (
  booking = {},
  dataOrigin = booking.dataOrigin || DATA_ORIGIN.REAL,
) => {
  const services = normalizeWorks({
    works: booking.services || booking.selectedServices,
  });

  return withDataOrigin(
    {
      _id: booking._id || booking.id,
      clientId: booking.clientId,
      providerId: booking.providerId,
      services,
      totalAmount: Number(booking.totalAmount ?? booking.price ?? 0),
      date: booking.date || booking.bookingDate || booking.scheduledDate || "",
      time: booking.time || booking.timeSlot || "",
      address: booking.address || "",
      status: String(booking.status || "pending").toLowerCase(),
      transactionId: booking.transactionId || "",
      createdAt: booking.createdAt || "",
      updatedAt: booking.updatedAt || "",
    },
    dataOrigin,
  );
};

export const normalizeTransaction = (
  transaction = {},
  dataOrigin = transaction.dataOrigin || DATA_ORIGIN.REAL,
) =>
  withDataOrigin(
    {
      _id: transaction._id || transaction.id,
      bookingId: transaction.bookingId,
      clientId: transaction.clientId,
      providerId: transaction.providerId,
      baseAmount: Number(transaction.baseAmount || transaction.amount || 0),
      clientFee: Number(transaction.clientFee ?? transaction.clientPlatformFee ?? 0),
      providerFee: Number(
        transaction.providerFee ?? transaction.providerPlatformFee ?? 0,
      ),
      totalPaid: Number(transaction.totalPaid ?? transaction.totalPaidByClient ?? 0),
      providerEarn: Number(transaction.providerEarn ?? transaction.netToProvider ?? 0),
      paymentMethod: transaction.paymentMethod || "",
      status: String(transaction.status || "pending").toLowerCase(),
      createdAt: transaction.createdAt || "",
      updatedAt: transaction.updatedAt || "",
    },
    dataOrigin,
  );

export const normalizeEntity = (entity = {}, kind = "user", dataOrigin) => {
  if (kind === "booking") return normalizeBooking(entity, dataOrigin);
  if (kind === "transaction") return normalizeTransaction(entity, dataOrigin);
  return normalizeUser(entity, dataOrigin);
};
