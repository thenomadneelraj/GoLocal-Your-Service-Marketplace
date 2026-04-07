const Client = require("../models/Client");
const PlatformSetting = require("../models/PlatformSetting");
const Transaction = require("../models/Transaction");
const { buildCsvBuffer, buildPdfBuffer } = require("../utils/adminExport");

const normalizeStatus = (value = "") => String(value || "").trim().toLowerCase();

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

const serializeTransaction = (transaction, currency = "INR") => {
  const booking = transaction.bookingId || {};
  const provider = booking.providerId || {};
  const service = booking.serviceId || {};
  const status = normalizeStatus(transaction.status);

  return {
    id: transaction._id,
    invoiceNumber: buildInvoiceNumber(transaction._id),
    amount: Number(transaction.amount || 0),
    amountLabel: formatCurrency(transaction.amount || 0, currency),
    status,
    paymentMethod: transaction.paymentMethod || "upi",
    paymentStatus: normalizeStatus(booking.paymentStatus || transaction.status || "pending"),
    createdAt: transaction.createdAt,
    createdLabel: formatDateTime(transaction.createdAt),
    transactionId:
      transaction.transactionId ||
      `TX-${String(transaction._id).slice(-8).toUpperCase()}`,
    bookingId: booking._id || transaction.bookingId,
    providerId: provider._id || null,
    providerName: provider.name || "Provider",
    providerServiceType: provider.serviceType || "Service",
    serviceTitle: service.title || provider.serviceType || "Service",
    bookingDate: booking.bookingDate || null,
    bookingDateLabel: formatDateTime(booking.bookingDate),
    timeSlot: booking.timeSlot || "",
    address: booking.address || "",
  };
};

const loadClientTransactions = async (userId, { page = 1, limit = 10 } = {}) => {
  const client = await Client.findOne({ userId });
  const settings = await PlatformSetting.findOne().lean();
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
        select: "bookingDate timeSlot address paymentStatus providerId serviceId",
        populate: [
          { path: "providerId", select: "name serviceType" },
          { path: "serviceId", select: "title category price" },
        ],
      })
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
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const exportTransactions = async (req, res) => {
  try {
    const payload = await loadClientTransactions(req.user._id, {
      page: 1,
      limit: 500,
    });

    const buffer = buildCsvBuffer({
      columns: [
        { header: "Invoice Number", key: "invoiceNumber" },
        { header: "Transaction ID", key: "transactionId" },
        { header: "Provider", key: "providerName" },
        { header: "Service", key: "serviceTitle" },
        { header: "Amount", key: "amountLabel" },
        { header: "Status", key: "status" },
        { header: "Payment Method", key: "paymentMethod" },
        { header: "Created At", key: "createdLabel" },
      ],
      rows: payload.items,
    });

    const fileName = `golocal-client-transactions-${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
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

    const buffer = buildPdfBuffer({
      title: `GoLocal Invoice ${transaction.invoiceNumber}`,
      lines: [
        `Invoice Number: ${transaction.invoiceNumber}`,
        `Transaction ID: ${transaction.transactionId}`,
        `Provider: ${transaction.providerName}`,
        `Service: ${transaction.serviceTitle}`,
        `Amount: ${transaction.amountLabel}`,
        `Status: ${transaction.status}`,
        `Payment Method: ${String(transaction.paymentMethod || "").toUpperCase()}`,
        `Booking Date: ${transaction.bookingDateLabel || "Not available"}`,
        `Time Slot: ${transaction.timeSlot || "Flexible"}`,
        `Address: ${transaction.address || "Not provided"}`,
        `Issued At: ${transaction.createdLabel}`,
      ],
    });

    const fileName = `${transaction.invoiceNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
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
};
