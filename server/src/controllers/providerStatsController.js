const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getPlatformSettings } = require("../services/platformSettingsService");
const {
  buildCsvBuffer,
  buildPdfBuffer,
  buildXlsxBuffer,
} = require("../utils/adminExport");
const {
  BOOKING_STATUS,
  normalizeBookingStatus,
} = require("../utils/bookingStatus");
const {
  normalizeTransactionStatus,
  isPaidTransaction,
  isPendingTransaction,
} = require("../utils/transactionStatus");

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const toNumber = (value) => Number(value || 0);

const formatCurrency = (value = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const isSameLocalDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const toSettlementRecord = (transaction, commissionPercentage = 10) => {
  const amount = toNumber(transaction.baseAmount || transaction.amount);
  const commission =
    toNumber(transaction.providerPlatformFee) ||
    Math.round((amount * Number(commissionPercentage || 10)) / 100);
  const netAmount =
    toNumber(transaction.netToProvider) || Math.max(0, amount - commission);

  return {
    id: transaction._id,
    amount,
    commission,
    netAmount,
    status: normalizeTransactionStatus(transaction.status),
    createdAt: transaction.createdAt,
    payoutDate: isPaidTransaction(transaction.status) ? transaction.createdAt : null,
    paymentMethod: transaction.paymentMethod || "upi",
    bookingId: transaction.bookingId?._id || transaction.bookingId,
    serviceTitle:
      transaction.serviceSnapshot?.services
        ?.map((service) => service.title)
        .filter(Boolean)
        .join(", ") ||
      transaction.serviceSnapshot?.title ||
      transaction.bookingId?.serviceId?.title ||
      transaction.bookingId?.serviceId?.name ||
      "Service",
    clientPaid: toNumber(transaction.totalPaidByClient || transaction.amount),
    clientPlatformFee: toNumber(transaction.clientPlatformFee || 0),
    providerPlatformFee: toNumber(transaction.providerPlatformFee || commission),
    providerUpiId: transaction.providerPaymentSnapshot?.upiId || "",
    providerBankName: transaction.providerPaymentSnapshot?.bankName || "",
    clientUpiId: transaction.clientPaymentSnapshot?.upiId || "",
    clientBankName: transaction.clientPaymentSnapshot?.bankName || "",
  };
};

const build7DaySeries = (records = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: getDayKey(date),
      label: date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      amount: 0,
    };
  });

  const seriesMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  records.forEach((record) => {
    if (!isPaidTransaction(record.status)) return;
    const createdAt = new Date(record.createdAt);
    createdAt.setHours(0, 0, 0, 0);
    const bucket = seriesMap.get(getDayKey(createdAt));
    if (bucket) {
      bucket.amount += toNumber(record.netAmount);
    }
  });

  return buckets.map(({ label, amount }) => ({ label, amount }));
};

const build6MonthSeries = (records = []) => {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: getMonthKey(date),
      label: MONTHS[date.getMonth()],
      amount: 0,
    };
  });

  const seriesMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  records.forEach((record) => {
    if (!isPaidTransaction(record.status)) return;
    const bucket = seriesMap.get(getMonthKey(new Date(record.createdAt)));
    if (bucket) {
      bucket.amount += toNumber(record.netAmount);
    }
  });

  return buckets.map(({ label, amount }) => ({ label, amount }));
};

const buildEmptyDashboard = (currency = "INR") => ({
  summary: {
    appointmentsBooked: 0,
    pendingRequests: 0,
    totalIncome: 0,
    totalClients: 0,
  },
  earnings7d: build7DaySeries(),
  earnings6m: build6MonthSeries(),
  todaySchedule: [],
  recentAppointments: [],
  topServices: [],
  currency,
});

const sortBookingsByDate = (left, right) => {
  const leftDate = new Date(left.bookingDate || left.createdAt || 0).getTime();
  const rightDate = new Date(right.bookingDate || right.createdAt || 0).getTime();

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  return String(left.timeSlot || "").localeCompare(String(right.timeSlot || ""));
};

const serializeBooking = (booking) => ({
  id: booking._id,
  clientName: booking.clientId?.name || "Client",
  clientAvatar: booking.clientId?.profileImage || null,
  serviceTitle: booking.serviceId?.title || booking.serviceId?.name || "Service",
  status: normalizeBookingStatus(booking.status),
  bookingDate: booking.bookingDate ? booking.bookingDate.toISOString() : null,
  timeSlot: booking.timeSlot || "",
  amount: toNumber(booking.price),
});

// In-memory cache for platform settings (reduces DB calls)
const platformSettingsCache = {
  data: null,
  timestamp: 0,
  TTL: 60000, // 1 minute cache
};

const getCachedPlatformSettings = async () => {
  const now = Date.now();
  if (platformSettingsCache.data && (now - platformSettingsCache.timestamp) < platformSettingsCache.TTL) {
    return platformSettingsCache.data;
  }
  
  const { getPlatformSettings } = require("../services/platformSettingsService");
  const settings = await getPlatformSettings();
  platformSettingsCache.data = settings;
  platformSettingsCache.timestamp = now;
  return settings;
};

const loadProviderData = async (providerId, commissionPercentage, options = {}) => {
  const {
    limit = 100,
    dateRange = null, // { start: Date, end: Date }
    populateClients = true,
    populateServices = true,
  } = options;

  // Build query with optional date range for better performance
  const bookingQuery = { providerId };
  if (dateRange) {
    bookingQuery.bookingDate = { $gte: dateRange.start, $lte: dateRange.end };
  }

  // Fetch bookings with limited fields for performance
  const bookings = await Booking.find(bookingQuery)
    .select("_id providerId clientId serviceId status bookingDate timeSlot price createdAt review")
    .populate(populateClients ? "clientId" : "", "name profileImage")
    .populate(populateServices ? "serviceId" : "", "title category price name")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const bookingIds = bookings.map((booking) => booking._id);

  // Fetch transactions only if there are bookings
  const transactions = bookingIds.length
    ? await Transaction.find({ bookingId: { $in: bookingIds } })
        .select("_id bookingId status amount baseAmount netToProvider providerPlatformFee clientPlatformFee totalPaidByClient paymentMethod createdAt transactionId serviceSnapshot providerPaymentSnapshot clientPaymentSnapshot")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  return {
    bookings,
    transactions: transactions.map((transaction) =>
      toSettlementRecord(transaction, commissionPercentage)
    ),
  };
};

const getProviderDashboard = async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.user._id, role: "provider" });
    const settings = await getPlatformSettings();
    const currency = settings?.currency || "INR";
    const commissionPercentage = Number(settings?.commissionPercentage || 10);

    if (!provider) {
      return res.json({ success: true, data: buildEmptyDashboard(currency) });
    }

    const { bookings, transactions } = await loadProviderData(
      provider._id,
      commissionPercentage
    );

    const activeBookings = bookings.filter((booking) => {
      const status = normalizeBookingStatus(booking.status);
      return ![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(status);
    });

    const distinctClients = new Set(
      activeBookings
        .map(
          (booking) =>
            booking.clientId?._id?.toString() || booking.clientId?.toString()
        )
        .filter(Boolean)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySchedule = activeBookings
      .filter((booking) => {
        if (!booking.bookingDate) return false;
        return isSameLocalDay(new Date(booking.bookingDate), today);
      })
      .sort(sortBookingsByDate)
      .map(serializeBooking);

    const recentAppointments = [...bookings]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 5)
      .map(serializeBooking);

    const serviceCounts = new Map();
    activeBookings.forEach((booking) => {
      const serviceId =
        booking.serviceId?._id?.toString() || booking.serviceId?.toString();
      const serviceTitle =
        booking.serviceId?.title || booking.serviceId?.name || "Service";

      if (!serviceId) return;

      const current = serviceCounts.get(serviceId) || {
        serviceId,
        serviceTitle,
        bookings: 0,
      };

      current.bookings += 1;
      serviceCounts.set(serviceId, current);
    });

    const topServices = [...serviceCounts.values()]
      .sort((left, right) => right.bookings - left.bookings)
      .slice(0, 4);

    const topServiceMax = topServices[0]?.bookings || 0;

    res.json({
      success: true,
      data: {
        summary: {
          appointmentsBooked: activeBookings.length,
          pendingRequests: bookings.filter(
            (booking) => normalizeBookingStatus(booking.status) === BOOKING_STATUS.PENDING
          ).length,
          totalIncome: transactions
            .filter((transaction) => isPaidTransaction(transaction.status))
            .reduce((total, transaction) => total + toNumber(transaction.netAmount), 0),
          totalClients: distinctClients.size,
        },
        earnings7d: build7DaySeries(transactions),
        earnings6m: build6MonthSeries(transactions),
        todaySchedule,
        recentAppointments,
        topServices: topServices.map((service) => ({
          ...service,
          share: topServiceMax ? Math.round((service.bookings / topServiceMax) * 100) : 0,
        })),
        currency,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEarnings = async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.user._id, role: "provider" });
    if (!provider) return res.json({ success: true, data: [] });

    const settings = await getPlatformSettings();
    const { transactions } = await loadProviderData(
      provider._id,
      Number(settings?.commissionPercentage || 10)
    );

    const data = build6MonthSeries(transactions).map((item) => ({
      month: item.label,
      earnings: item.amount,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingsTrend = async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.user._id, role: "provider" });
    if (!provider) return res.json({ success: true, data: [] });

    const bookings = await Booking.find({ providerId: provider._id }).lean();
    const dataMap = new Map(
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index), 1);
        return [getMonthKey(date), { month: MONTHS[date.getMonth()], jobs: 0 }];
      })
    );

    bookings.forEach((booking) => {
      if (
        [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(
          normalizeBookingStatus(booking.status)
        )
      ) {
        return;
      }

      const bucket = dataMap.get(getMonthKey(new Date(booking.createdAt)));
      if (bucket) bucket.jobs += 1;
    });

    res.json({ success: true, data: [...dataMap.values()] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getServicePerformance = async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.user._id, role: "provider" });
    if (!provider) return res.json({ success: true, data: [] });

    const bookings = await Booking.find({
      providerId: provider._id,
      "review.rating": { $exists: true },
    }).select("review");

    const ratingCounts = {
      "5 Star": 0,
      "4 Star": 0,
      "3 Star": 0,
      "Below 3": 0,
    };

    bookings.forEach((booking) => {
      const rating = Number(booking.review?.rating || 0);
      if (rating >= 5) ratingCounts["5 Star"] += 1;
      else if (rating >= 4) ratingCounts["4 Star"] += 1;
      else if (rating >= 3) ratingCounts["3 Star"] += 1;
      else if (rating > 0) ratingCounts["Below 3"] += 1;
    });

    const data = Object.entries(ratingCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));

    res.json({
      success: true,
      data: data.length ? data : [{ name: "No Ratings", value: 1 }],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProviderPayouts = async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.user._id, role: "provider" });
    if (!provider) {
      return res.json({
        success: true,
        data: { items: [], total: 0, totalEarnings: 0, pendingAmount: 0 },
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const settings = await getPlatformSettings();
    const { transactions } = await loadProviderData(
      provider._id,
      Number(settings?.commissionPercentage || 10)
    );

    const total = transactions.length;
    const items = transactions.slice((page - 1) * limit, (page - 1) * limit + limit);
    const totalEarnings = transactions
      .filter((transaction) => isPaidTransaction(transaction.status))
      .reduce((sum, transaction) => sum + toNumber(transaction.netAmount), 0);
    const pendingAmount = transactions
      .filter((transaction) => isPendingTransaction(transaction.status))
      .reduce((sum, transaction) => sum + toNumber(transaction.netAmount), 0);
    const lastPaid = transactions
      .filter((transaction) => isPaidTransaction(transaction.status))
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pages: Math.ceil(total / limit),
        totalEarnings,
        pendingAmount,
        lastPaidAmount: lastPaid ? toNumber(lastPaid.netAmount) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const loadProviderPayoutPayload = async (providerId) => {
  const provider = await User.findOne({ _id: providerId, role: "provider" });
  if (!provider) {
    return { provider: null, items: [], currency: "INR" };
  }

  const settings = await getPlatformSettings();
  const { transactions } = await loadProviderData(
    provider._id,
    Number(settings?.commissionPercentage || 10)
  );

  return {
    provider,
    items: transactions,
    currency: settings?.currency || "INR",
  };
};

const exportProviderPayouts = async (req, res) => {
  try {
    const format = String(req.query?.format || "csv").trim().toLowerCase();
    const payload = await loadProviderPayoutPayload(req.user._id);
    const rows = payload.items.map((item) => ({
      ...item,
      amountLabel: formatCurrency(item.amount, payload.currency),
      commissionLabel: formatCurrency(item.commission, payload.currency),
      netAmountLabel: formatCurrency(item.netAmount, payload.currency),
      clientPaidLabel: formatCurrency(item.clientPaid, payload.currency),
      createdLabel: formatDateTime(item.createdAt),
    }));
    const columns = [
      { header: "Settlement ID", key: "id" },
      { header: "Work", key: "serviceTitle" },
      { header: "Base Amount", key: "amountLabel" },
      { header: "Provider Platform Fee", key: "commissionLabel" },
      { header: "Net To Provider", key: "netAmountLabel" },
      { header: "Client Paid", key: "clientPaidLabel" },
      { header: "Provider UPI ID", key: "providerUpiId" },
      { header: "Provider Bank Name", key: "providerBankName" },
      { header: "Client UPI ID", key: "clientUpiId" },
      { header: "Client Bank Name", key: "clientBankName" },
      { header: "Status", key: "status" },
      { header: "Created At", key: "createdLabel" },
    ];

    let buffer;
    let contentType = "text/csv; charset=utf-8";
    let extension = "csv";

    if (format === "pdf") {
      buffer = buildPdfBuffer({
        title: "GoLocal Provider Earnings",
        lines: rows.map((row) =>
          [
            `Settlement: ${String(row.id).slice(-8).toUpperCase()}`,
            `Work: ${row.serviceTitle}`,
            `Base: ${row.amountLabel}`,
            `Fee: ${row.commissionLabel}`,
            `Net: ${row.netAmountLabel}`,
            `Status: ${row.status}`,
            `Created: ${row.createdLabel}`,
          ].join(" | ")
        ),
      });
      contentType = "application/pdf";
      extension = "pdf";
    } else if (format === "xlsx") {
      buffer = buildXlsxBuffer({
        columns,
        rows,
        sheetName: "Earnings",
      });
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
    } else {
      buffer = buildCsvBuffer({ columns, rows });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="golocal-provider-earnings-${Date.now()}.${extension}"`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const downloadProviderInvoice = async (req, res) => {
  try {
    const format = String(req.query?.format || "pdf").trim().toLowerCase();
    const payload = await loadProviderPayoutPayload(req.user._id);
    const item = payload.items.find(
      (transaction) => String(transaction.id) === String(req.params.id)
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    const row = {
      ...item,
      amountLabel: formatCurrency(item.amount, payload.currency),
      commissionLabel: formatCurrency(item.commission, payload.currency),
      netAmountLabel: formatCurrency(item.netAmount, payload.currency),
      clientPaidLabel: formatCurrency(item.clientPaid, payload.currency),
      createdLabel: formatDateTime(item.createdAt),
    };

    const columns = [
      { header: "Settlement ID", key: "id" },
      { header: "Work", key: "serviceTitle" },
      { header: "Base Amount", key: "amountLabel" },
      { header: "Provider Platform Fee", key: "commissionLabel" },
      { header: "Net To Provider", key: "netAmountLabel" },
      { header: "Client Paid", key: "clientPaidLabel" },
      { header: "Provider UPI ID", key: "providerUpiId" },
      { header: "Provider Bank Name", key: "providerBankName" },
      { header: "Client UPI ID", key: "clientUpiId" },
      { header: "Client Bank Name", key: "clientBankName" },
      { header: "Status", key: "status" },
      { header: "Created At", key: "createdLabel" },
    ];

    let buffer;
    let contentType = "application/pdf";
    let extension = "pdf";

    if (format === "xlsx") {
      buffer = buildXlsxBuffer({
        columns,
        rows: [row],
        sheetName: "Invoice",
      });
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
    } else if (format === "csv") {
      buffer = buildCsvBuffer({ columns, rows: [row] });
      contentType = "text/csv; charset=utf-8";
      extension = "csv";
    } else {
      buffer = buildPdfBuffer({
        title: `Provider Invoice ${String(row.id).slice(-8).toUpperCase()}`,
        lines: [
          `Work: ${row.serviceTitle}`,
          `Base Amount: ${row.amountLabel}`,
          `Provider Platform Fee: ${row.commissionLabel}`,
          `Net To Provider: ${row.netAmountLabel}`,
          `Client Paid: ${row.clientPaidLabel}`,
          `Provider UPI ID: ${row.providerUpiId || "Not available"}`,
          `Provider Bank Name: ${row.providerBankName || "Not available"}`,
          `Client UPI ID: ${row.clientUpiId || "Not available"}`,
          `Client Bank Name: ${row.clientBankName || "Not available"}`,
          `Status: ${row.status}`,
          `Created At: ${row.createdLabel}`,
        ],
      });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="provider-invoice-${String(row.id).slice(-8).toUpperCase()}.${extension}"`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProviderDashboard,
  getEarnings,
  getBookingsTrend,
  getServicePerformance,
  getProviderPayouts,
  exportProviderPayouts,
  downloadProviderInvoice,
};
