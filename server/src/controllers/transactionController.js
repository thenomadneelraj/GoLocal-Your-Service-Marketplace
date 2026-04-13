const User = require("../models/User");
const Transaction = require("../models/Transaction");
const {
  buildCsvBuffer,
  buildPdfBuffer,
  buildXlsxBuffer,
} = require("../utils/adminExport");
const {
  getPlatformSettings,
} = require("../services/platformSettingsService");
const {
  normalizeTransactionStatus,
  isPaidTransaction,
} = require("../utils/transactionStatus");

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

const buildInvoiceNumber = (transactionId) =>
  `INV-${String(transactionId || "").slice(-8).toUpperCase()}`;

const buildServiceLabel = (transaction = {}) => {
  const services = Array.isArray(transaction?.serviceSnapshot?.services)
    ? transaction.serviceSnapshot.services
    : [];

  if (services.length) {
    return services.map((service) => service.title).filter(Boolean).join(", ");
  }

  return (
    transaction?.serviceSnapshot?.title ||
    transaction?.bookingId?.selectedServices?.map((service) => service.title).join(", ") ||
    transaction?.bookingId?.serviceId?.title ||
    "Service"
  );
};

const serializeTransaction = (transaction, currency = "INR") => {
  const booking = transaction.bookingId || {};
  const provider = transaction.providerId || booking.providerId || {};
  const status = normalizeTransactionStatus(transaction.status);
  const serviceLabel = buildServiceLabel(transaction);

  return {
    id: transaction._id,
    invoiceNumber: buildInvoiceNumber(transaction._id),
    amount: Number(transaction.totalPaidByClient || transaction.amount || 0),
    amountLabel: formatCurrency(
      transaction.totalPaidByClient || transaction.amount || 0,
      currency
    ),
    baseAmount: Number(transaction.baseAmount || booking.price || 0),
    baseAmountLabel: formatCurrency(
      transaction.baseAmount || booking.price || 0,
      currency
    ),
    clientPlatformFee: Number(transaction.clientPlatformFee || 0),
    clientPlatformFeeLabel: formatCurrency(
      transaction.clientPlatformFee || 0,
      currency
    ),
    providerPlatformFee: Number(transaction.providerPlatformFee || 0),
    providerPlatformFeeLabel: formatCurrency(
      transaction.providerPlatformFee || 0,
      currency
    ),
    totalPaidByClient: Number(transaction.totalPaidByClient || transaction.amount || 0),
    totalPaidByClientLabel: formatCurrency(
      transaction.totalPaidByClient || transaction.amount || 0,
      currency
    ),
    netToProvider: Number(transaction.netToProvider || 0),
    netToProviderLabel: formatCurrency(transaction.netToProvider || 0, currency),
    platformRevenue: Number(transaction.platformRevenue || 0),
    platformRevenueLabel: formatCurrency(transaction.platformRevenue || 0, currency),
    status,
    paymentMethod: transaction.paymentMethod || "upi",
    paymentStatus: normalizeTransactionStatus(
      booking.paymentStatus || transaction.status || "pending"
    ),
    createdAt: transaction.createdAt,
    createdLabel: formatDateTime(transaction.createdAt),
    transactionId:
      transaction.transactionId ||
      `TX-${String(transaction._id).slice(-8).toUpperCase()}`,
    bookingId: booking._id || transaction.bookingId,
    providerId: provider._id || transaction.providerId || null,
    providerName: provider.name || transaction.providerPaymentSnapshot?.name || "Provider",
    providerServiceType: provider.serviceType || "Service",
    serviceTitle: serviceLabel,
    services:
      transaction?.serviceSnapshot?.services ||
      booking?.selectedServices ||
      [],
    bookingDate: booking.bookingDate || null,
    bookingDateLabel: formatDateTime(booking.bookingDate),
    timeSlot: booking.timeSlot || "",
    address: booking.address || "",
    clientUpiId: transaction.clientPaymentSnapshot?.upiId || "",
    clientBankName: transaction.clientPaymentSnapshot?.bankName || "",
    providerUpiId: transaction.providerPaymentSnapshot?.upiId || "",
    providerBankName: transaction.providerPaymentSnapshot?.bankName || "",
  };
};

const loadClientTransactions = async (userId, { page = 1, limit = 10 } = {}) => {
  const client = await User.findOne({ _id: userId, role: "client" });
  const settings = await getPlatformSettings();
  const currency = settings?.currency || "INR";

  if (!client) {
    return {
      client: null,
      items: [],
      total: 0,
      page,
      pages: 0,
      currency,
    };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Transaction.find({ clientId: client._id })
      .populate({
        path: "bookingId",
        select:
          "bookingDate timeSlot address paymentStatus providerId serviceId selectedServices price",
        populate: [
          { path: "providerId", select: "name serviceType" },
          { path: "serviceId", select: "title category price" },
        ],
      })
      .populate("providerId", "name serviceType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ clientId: client._id }),
  ]);

  return {
    client,
    items: items.map((item) => serializeTransaction(item, currency)),
    total,
    page,
    pages: Math.ceil(total / limit),
    currency,
  };
};

const listTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || "").trim().toLowerCase();

    const payload = await loadClientTransactions(req.user._id, { page, limit });

    const filteredItems = search
      ? payload.items.filter((item) =>
          [
            item.invoiceNumber,
            item.providerName,
            item.providerServiceType,
            item.serviceTitle,
            item.transactionId,
            item.clientUpiId,
            item.providerUpiId,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search))
        )
      : payload.items;

    res.json({
      success: true,
      data: {
        items: filteredItems,
        total: payload.total,
        page: payload.page,
        pages: payload.pages,
        currency: payload.currency,
        summary: {
          totalSpent: filteredItems
            .filter((item) => isPaidTransaction(item.status))
            .reduce((sum, item) => sum + Number(item.totalPaidByClient || 0), 0),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const buildTransactionExport = ({ items = [], format = "csv" }) => {
  const columns = [
    { header: "Invoice Number", key: "invoiceNumber" },
    { header: "Transaction ID", key: "transactionId" },
    { header: "Provider", key: "providerName" },
    { header: "Work", key: "serviceTitle" },
    { header: "Base Amount", key: "baseAmountLabel" },
    { header: "Client Platform Fee", key: "clientPlatformFeeLabel" },
    { header: "Provider Platform Fee", key: "providerPlatformFeeLabel" },
    { header: "Client Paid", key: "totalPaidByClientLabel" },
    { header: "Provider Receives", key: "netToProviderLabel" },
    { header: "Client UPI ID", key: "clientUpiId" },
    { header: "Client Bank", key: "clientBankName" },
    { header: "Provider UPI ID", key: "providerUpiId" },
    { header: "Provider Bank", key: "providerBankName" },
    { header: "Status", key: "status" },
    { header: "Payment Method", key: "paymentMethod" },
    { header: "Created At", key: "createdLabel" },
  ];

  if (format === "pdf") {
    return buildPdfBuffer({
      title: "GoLocal Client Transactions",
      lines: items.map((row) =>
        [
          `Invoice: ${row.invoiceNumber}`,
          `Transaction: ${row.transactionId}`,
          `Provider: ${row.providerName}`,
          `Work: ${row.serviceTitle}`,
          `Client Paid: ${row.totalPaidByClientLabel}`,
          `Provider Receives: ${row.netToProviderLabel}`,
          `Status: ${row.status}`,
          `Created: ${row.createdLabel}`,
        ].join(" | ")
      ),
    });
  }

  if (format === "xlsx") {
    return buildXlsxBuffer({
      columns,
      rows: items,
      sheetName: "Transactions",
    });
  }

  return buildCsvBuffer({
    columns,
    rows: items,
  });
};

const getFileMeta = (format, prefix) => {
  if (format === "pdf") {
    return {
      fileName: `${prefix}-${Date.now()}.pdf`,
      contentType: "application/pdf",
    };
  }

  if (format === "xlsx") {
    return {
      fileName: `${prefix}-${Date.now()}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  return {
    fileName: `${prefix}-${Date.now()}.csv`,
    contentType: "text/csv; charset=utf-8",
  };
};

const exportTransactions = async (req, res) => {
  try {
    const format = String(req.query?.format || "csv").trim().toLowerCase();
    const payload = await loadClientTransactions(req.user._id, {
      page: 1,
      limit: 500,
    });

    const buffer = buildTransactionExport({
      items: payload.items,
      format,
    });

    const meta = getFileMeta(format, "golocal-client-transactions");
    res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${meta.fileName}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const format = String(req.query?.format || "pdf").trim().toLowerCase();
    const payload = await loadClientTransactions(req.user._id, {
      page: 1,
      limit: 500,
    });
    const transaction = payload.items.find(
      (item) => String(item.id) === String(req.params.id)
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    let buffer;

    if (format === "xlsx" || format === "csv") {
      buffer = format === "xlsx"
        ? buildXlsxBuffer({
            columns: [
              { header: "Invoice Number", key: "invoiceNumber" },
              { header: "Transaction ID", key: "transactionId" },
              { header: "Client UPI ID", key: "clientUpiId" },
              { header: "Client Bank Name", key: "clientBankName" },
              { header: "Work", key: "serviceTitle" },
              { header: "Base Amount", key: "baseAmountLabel" },
              { header: "Client Platform Fee", key: "clientPlatformFeeLabel" },
              { header: "Client Paid", key: "totalPaidByClientLabel" },
              { header: "Provider UPI ID", key: "providerUpiId" },
              { header: "Provider Bank Name", key: "providerBankName" },
              { header: "Provider Platform Fee", key: "providerPlatformFeeLabel" },
              { header: "Provider Receives", key: "netToProviderLabel" },
              { header: "Booking Date", key: "bookingDateLabel" },
              { header: "Time Slot", key: "timeSlot" },
              { header: "Issued At", key: "createdLabel" },
            ],
            rows: [transaction],
            sheetName: "Invoice",
          })
        : buildCsvBuffer({
            columns: [
              { header: "Invoice Number", key: "invoiceNumber" },
              { header: "Transaction ID", key: "transactionId" },
              { header: "Client UPI ID", key: "clientUpiId" },
              { header: "Client Bank Name", key: "clientBankName" },
              { header: "Work", key: "serviceTitle" },
              { header: "Base Amount", key: "baseAmountLabel" },
              { header: "Client Platform Fee", key: "clientPlatformFeeLabel" },
              { header: "Client Paid", key: "totalPaidByClientLabel" },
              { header: "Provider UPI ID", key: "providerUpiId" },
              { header: "Provider Bank Name", key: "providerBankName" },
              { header: "Provider Platform Fee", key: "providerPlatformFeeLabel" },
              { header: "Provider Receives", key: "netToProviderLabel" },
              { header: "Booking Date", key: "bookingDateLabel" },
              { header: "Time Slot", key: "timeSlot" },
              { header: "Issued At", key: "createdLabel" },
            ],
            rows: [transaction],
          });
    } else {
      buffer = buildPdfBuffer({
        title: `GoLocal Invoice ${transaction.invoiceNumber}`,
        lines: [
          `Invoice Number: ${transaction.invoiceNumber}`,
          `Transaction ID: ${transaction.transactionId}`,
          `Work: ${transaction.serviceTitle}`,
          `Base Amount: ${transaction.baseAmountLabel}`,
          `Client Platform Fee: ${transaction.clientPlatformFeeLabel}`,
          `Client Paid: ${transaction.totalPaidByClientLabel}`,
          `Provider Platform Fee: ${transaction.providerPlatformFeeLabel}`,
          `Provider Receives: ${transaction.netToProviderLabel}`,
          `Client UPI ID: ${transaction.clientUpiId || "Not available"}`,
          `Client Bank Name: ${transaction.clientBankName || "Not available"}`,
          `Provider UPI ID: ${transaction.providerUpiId || "Not available"}`,
          `Provider Bank Name: ${transaction.providerBankName || "Not available"}`,
          `Booking Date: ${transaction.bookingDateLabel || "Not available"}`,
          `Time Slot: ${transaction.timeSlot || "Flexible"}`,
          `Issued At: ${transaction.createdLabel}`,
        ],
      });
    }

    const meta = getFileMeta(format, transaction.invoiceNumber);
    res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${meta.fileName}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  listTransactions,
  exportTransactions,
  downloadInvoice,
  serializeTransaction,
  loadClientTransactions,
  formatCurrency,
  formatDateTime,
};
