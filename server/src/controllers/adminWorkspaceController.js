const Admin = require("../models/Admin");
const ActivityLog = require("../models/ActivityLog");
const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Dispute = require("../models/Dispute");
const PlatformSetting = require("../models/PlatformSetting");
const Provider = require("../models/Provider");
const Service = require("../models/Service");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const ContactMessage = require("../models/ContactMessage");
const adminService = require("../services/adminService");
const {
  APPROVAL_STATUS,
  USER_STATUS,
  normalizeApprovalStatus,
  normalizeUserStatus,
} = require("../utils/accountState");
const {
  normalizeBookingStatus,
  isAcceptedBooking,
  isCancelledBooking,
  isCompletedBooking,
  isPendingBooking,
} = require("../utils/bookingStatus");
const { buildCsvBuffer, buildPdfBuffer } = require("../utils/adminExport");

const DEFAULT_PLATFORM_SETTINGS = {
  commissionPercentage: 10,
  commissionRate: 10,
  currency: "INR",
  platformName: "GoLocal",
  supportEmail: "support@golocal.com",
  maintenanceMessage:
    "Website is currently under maintenance. Please check back soon.",
};

const EXPORT_PACKAGES = {
  users: {
    title: "User Directory Export",
    filename: "user-directory",
    columns: [
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Role", key: "role" },
      { header: "Status", key: "status" },
      { header: "Approval Status", key: "approvalStatus" },
      { header: "Joined At", key: "joinedAt" },
    ],
  },
  bookings: {
    title: "Bookings and Revenue Export",
    filename: "bookings-revenue",
    columns: [
      { header: "Service", key: "service" },
      { header: "Client", key: "client" },
      { header: "Provider", key: "provider" },
      { header: "Schedule", key: "schedule" },
      { header: "Status", key: "status" },
      { header: "Payment", key: "payment" },
      { header: "Amount", key: "amount" },
    ],
  },
  disputes: {
    title: "Dispute Resolution Export",
    filename: "dispute-resolution",
    columns: [
      { header: "Booking", key: "booking" },
      { header: "Client", key: "client" },
      { header: "Provider", key: "provider" },
      { header: "Reason", key: "reason" },
      { header: "Status", key: "status" },
      { header: "Created At", key: "createdAt" },
    ],
  },
  compliance: {
    title: "Compliance Archive",
    filename: "compliance-archive",
    columns: [
      { header: "Metric", key: "metric" },
      { header: "Value", key: "value" },
    ],
  },
};

const buildRegex = (value = "") =>
  value ? new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCurrency = (value = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const getMonthLabels = (months = 6) => {
  const labels = [];
  const now = new Date();
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    labels.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      year: date.getFullYear(),
      month: date.getMonth(),
    });
  }
  return labels;
};

const toMonthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const ensurePlatformSettings = async () => {
  let settings = await PlatformSetting.findOne();
  if (!settings) {
    settings = await PlatformSetting.create(DEFAULT_PLATFORM_SETTINGS);
  }
  return settings;
};

const recordAdminActivity = async (
  req,
  {
    action,
    description = "",
    module = "admin",
    targetType = "",
    targetId = "",
    metadata = {},
  }
) => {
  if (!req.user?._id) return;

  try {
    await ActivityLog.create({
      userId: req.auth?.accountType === "ADMIN" ? undefined : req.user._id,
      role: String(req.user?.role || "").toLowerCase(),
      action,
      module,
      description,
      ipAddress: req.ip,
      actor: req.user._id,
      actorModel: req.auth?.accountType === "ADMIN" ? "Admin" : "User",
      actorRole: String(req.user?.role || "").toLowerCase(),
      targetType,
      targetId: targetId ? String(targetId) : "",
      metadata,
    });
  } catch (error) {
    console.error("Failed to record admin activity:", error.message);
  }
};

const buildUserRow = ({ user, clientProfile, providerProfile }) => {
  const role = String(user?.role || "").toLowerCase();
  const status = normalizeUserStatus(user?.status, user?.isActive);
  const approvalStatus = normalizeApprovalStatus(user?.approvalStatus, {
    role,
    status,
    isApproved: providerProfile?.isApproved,
  });

  const name =
    clientProfile?.name ||
    providerProfile?.name ||
    user?.name ||
    user?.email?.split("@")?.[0] ||
    "Unnamed User";

  return {
    id: String(user._id),
    name,
    email: user.email,
    role,
    status,
    approvalStatus,
    isApproved: approvalStatus === APPROVAL_STATUS.APPROVED,
    phone: clientProfile?.phone || providerProfile?.phone || "",
    address: clientProfile?.address || providerProfile?.address || "",
    serviceType: providerProfile?.serviceType || "",
    providerProfileId: providerProfile?._id ? String(providerProfile._id) : "",
    joinedAt: user.createdAt,
    joinedLabel: formatDateTime(user.createdAt),
    avatar: clientProfile?.profileImage || providerProfile?.profileImage || "",
  };
};

const buildBookingRow = (booking) => {
  const status = normalizeBookingStatus(booking.status);
  return {
    id: String(booking._id),
    service: booking.serviceId?.title || "Service",
    category: booking.serviceId?.category || "General",
    client: booking.clientId?.name || "Client",
    clientEmail: booking.clientId?.userId?.email || "",
    provider: booking.providerId?.name || "Provider",
    providerEmail: booking.providerId?.userId?.email || "",
    schedule: formatDateTime(booking.bookingDate),
    timeSlot: booking.timeSlot,
    status,
    paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
    amount: booking.price || 0,
    amountLabel: formatCurrency(booking.price || 0),
  };
};

const buildDisputeRow = (dispute) => ({
  id: String(dispute._id),
  booking: dispute.bookingId?._id ? `#${String(dispute.bookingId._id).slice(-6)}` : "Booking",
  client: dispute.clientId?.name || "Client",
  provider: dispute.providerId?.name || "Provider",
  reason: dispute.reason,
  description: dispute.description,
  status: String(dispute.status || "open").toLowerCase(),
  resolutionNote: dispute.resolutionNote || "",
  createdAt: dispute.createdAt,
  createdLabel: formatDateTime(dispute.createdAt),
});

const buildTransactionRow = (transaction, commissionPercentage = 10) => {
  const amount = Number(transaction.amount || 0);
  const platformFee = (amount * Number(commissionPercentage || 10)) / 100;
  const status = String(transaction.status || "pending").toLowerCase();

  return {
    id: String(transaction._id),
    reference:
      transaction.transactionId ||
      `TX-${String(transaction._id).slice(-5).toUpperCase()}`,
    provider:
      transaction.bookingId?.providerId?.name ||
      transaction.bookingId?.providerId?.serviceType ||
      "Provider",
    service: transaction.bookingId?.serviceId?.title || "Service",
    amount,
    amountLabel: formatCurrency(amount),
    platformFee,
    platformFeeLabel: formatCurrency(platformFee),
    status,
    statusLabel:
      status === "success"
        ? "settled"
        : status === "failed"
          ? "refund review"
          : "pending payout",
    createdAt: transaction.createdAt,
    createdLabel: formatDateTime(transaction.createdAt),
  };
};

const getDashboard = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const [
      totalUsers,
      totalAdmins,
      pendingProviders,
      bookings,
      transactions,
      services,
      disputes,
    ] = await Promise.all([
      User.countDocuments(),
      Admin.countDocuments(),
      User.countDocuments({ role: "provider", approvalStatus: "pending" }),
      Booking.find().sort({ createdAt: 1 }).select("status price createdAt"),
      Transaction.find().sort({ createdAt: 1 }).select("status amount createdAt"),
      Service.find().select("category"),
      Dispute.countDocuments({ status: { $in: ["open", "under_review"] } }),
    ]);

    const totalRevenue = transactions
      .filter((transaction) => String(transaction.status).toLowerCase() === "success")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const monthLabels = getMonthLabels(6);
    const userSeries = monthLabels.map((month) => ({
      month: month.label,
      users: 0,
      revenue: 0,
      bookings: 0,
    }));

    const monthIndex = new Map(monthLabels.map((month, index) => [month.key, index]));

    const users = await User.find().select("createdAt");
    users.forEach((user) => {
      const index = monthIndex.get(toMonthKey(user.createdAt));
      if (index !== undefined) {
        userSeries[index].users += 1;
      }
    });

    transactions.forEach((transaction) => {
      const index = monthIndex.get(toMonthKey(transaction.createdAt));
      if (index !== undefined && String(transaction.status).toLowerCase() === "success") {
        userSeries[index].revenue += Number(transaction.amount || 0);
      }
    });

    bookings.forEach((booking) => {
      const index = monthIndex.get(toMonthKey(booking.createdAt));
      if (index !== undefined) {
        userSeries[index].bookings += 1;
      }
    });

    const categoryCounts = services.reduce((accumulator, service) => {
      const category = service.category || "Other";
      accumulator[category] = (accumulator[category] || 0) + 1;
      return accumulator;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers: totalUsers + totalAdmins,
          pendingProviders,
          revenue: totalRevenue,
          bookingsTracked: bookings.length,
          openDisputes: disputes,
        },
        charts: {
          growth: userSeries.map((item) => ({
            month: item.month,
            users: item.users,
            revenue: Number(item.revenue.toFixed(2)),
            bookings: item.bookings,
          })),
          categoryDistribution: Object.entries(categoryCounts).map(([name, value]) => ({
            name,
            value,
          })),
        },
        meta: {
          currency: settings.currency || "INR",
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const { search = "", role = "", status = "" } = req.query || {};
    const [users, clients, providers] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }),
      Client.find(),
      Provider.find(),
    ]);

    const clientMap = new Map(clients.map((client) => [String(client.userId), client]));
    const providerMap = new Map(providers.map((provider) => [String(provider.userId), provider]));

    const rows = users.map((user) =>
      buildUserRow({
        user,
        clientProfile: clientMap.get(String(user._id)),
        providerProfile: providerMap.get(String(user._id)),
      })
    );

    const regex = buildRegex(search);
    const normalizedRole = String(role || "").trim().toLowerCase();
    const normalizedStatus = String(status || "").trim().toLowerCase();

    const filteredItems = rows.filter((item) => {
      if (normalizedRole && normalizedRole !== "all" && item.role !== normalizedRole) {
        return false;
      }

      if (normalizedStatus && normalizedStatus !== "all") {
        if (
          ![item.status, item.approvalStatus].includes(normalizedStatus)
        ) {
          return false;
        }
      }

      if (
        regex &&
        ![
          item.name,
          item.email,
          item.phone,
          item.serviceType,
        ].some((value) => regex.test(String(value || "")))
      ) {
        return false;
      }

      return true;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers: rows.length,
          pendingApproval: rows.filter((item) => item.approvalStatus === APPROVAL_STATUS.PENDING).length,
          approved: rows.filter((item) => item.approvalStatus === APPROVAL_STATUS.APPROVED).length,
          rejected: rows.filter((item) => item.approvalStatus === APPROVAL_STATUS.REJECTED || item.status === USER_STATUS.REJECTED).length,
          suspended: rows.filter((item) => item.status === USER_STATUS.SUSPENDED).length,
        },
        items: filteredItems,
        totalShown: filteredItems.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedStatus = String(
      req.body?.status || req.body?.approvalStatus || req.body?.action || ""
    )
      .trim()
      .toLowerCase();

    const existingUser = await User.findById(id).select("-password");
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "A status or action is required.",
      });
    }

    let nextUser = null;

    if (
      String(existingUser.role || "").toLowerCase() === "provider" &&
      ["approved", "rejected", "pending"].includes(requestedStatus)
    ) {
      const provider = await Provider.findOne({ userId: id });
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "Provider profile not found.",
        });
      }

      await adminService.updateProviderStatus(provider._id, requestedStatus);
      nextUser = await User.findById(id).select("-password");
    } else {
      const normalizedStatus =
        requestedStatus === "approved" ? USER_STATUS.ACTIVE : requestedStatus;
      nextUser = await adminService.updateUserStatus(id, normalizedStatus);
    }

    const [clientProfile, providerProfile] = await Promise.all([
      Client.findOne({ userId: id }),
      Provider.findOne({ userId: id }),
    ]);

    await recordAdminActivity(req, {
      action: "ADMIN_USER_STATUS_UPDATED",
      description: `Admin updated ${nextUser.email} to ${requestedStatus}.`,
      module: "users",
      targetType: "User",
      targetId: id,
      metadata: { requestedStatus },
    });

    res.json({
      success: true,
      message: "User status updated successfully.",
      data: buildUserRow({
        user: nextUser,
        clientProfile,
        providerProfile,
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingsSummary = async (req, res) => {
  try {
    const bookings = await Booking.find().select("status");

    res.json({
      success: true,
      data: {
        totalBookings: bookings.length,
        pendingRequests: bookings.filter((booking) => isPendingBooking(booking.status)).length,
        acceptedJobs: bookings.filter((booking) => isAcceptedBooking(booking.status)).length,
        cancelledJobs: bookings.filter((booking) => isCancelledBooking(booking.status)).length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookings = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query || {};
    const bookings = await Booking.find()
      .populate({
        path: "clientId",
        select: "name userId",
        populate: { path: "userId", select: "email" },
      })
      .populate({
        path: "providerId",
        select: "name userId serviceType",
        populate: { path: "userId", select: "email" },
      })
      .populate("serviceId", "title category")
      .sort({ createdAt: -1 });

    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const items = bookings
      .map(buildBookingRow)
      .filter((booking) => {
        if (normalizedStatus && normalizedStatus !== "all" && booking.status !== normalizedStatus) {
          return false;
        }

        if (
          regex &&
          ![
            booking.service,
            booking.category,
            booking.client,
            booking.clientEmail,
            booking.provider,
            booking.providerEmail,
          ].some((value) => regex.test(String(value || "")))
        ) {
          return false;
        }

        return true;
      });

    res.json({
      success: true,
      data: {
        items,
        totalShown: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactionsSummary = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const transactions = await Transaction.find().select("amount status");
    const commissionPercentage =
      Number(settings.commissionPercentage ?? settings.commissionRate ?? 10) || 10;

    const grossVolume = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );
    const platformFees = transactions
      .filter((transaction) => String(transaction.status).toLowerCase() === "success")
      .reduce(
        (sum, transaction) =>
          sum + (Number(transaction.amount || 0) * commissionPercentage) / 100,
        0
      );
    const pendingHolds = transactions
      .filter((transaction) => String(transaction.status).toLowerCase() === "pending")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const failedCount = transactions.filter(
      (transaction) => String(transaction.status).toLowerCase() === "failed"
    ).length;

    res.json({
      success: true,
      data: {
        grossVolume,
        platformFees,
        pendingHolds,
        chargebackRate: transactions.length
          ? Number(((failedCount / transactions.length) * 100).toFixed(1))
          : 0,
        currency: settings.currency || "INR",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query || {};
    const settings = await ensurePlatformSettings();
    const commissionPercentage =
      Number(settings.commissionPercentage ?? settings.commissionRate ?? 10) || 10;

    const transactions = await Transaction.find()
      .populate({
        path: "bookingId",
        select: "providerId serviceId",
        populate: [
          { path: "providerId", select: "name serviceType" },
          { path: "serviceId", select: "title" },
        ],
      })
      .sort({ createdAt: -1 });

    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const items = transactions
      .map((transaction) => buildTransactionRow(transaction, commissionPercentage))
      .filter((transaction) => {
        if (normalizedStatus && normalizedStatus !== "all" && transaction.status !== normalizedStatus) {
          return false;
        }

        if (
          regex &&
          ![
            transaction.reference,
            transaction.provider,
            transaction.service,
            transaction.statusLabel,
          ].some((value) => regex.test(String(value || "")))
        ) {
          return false;
        }

        return true;
      });

    const financeAlerts = [
      {
        id: "refund-review",
        title: "Refund request exceeds average",
        description: "Failed transactions should be reviewed for payout reversals and follow-up.",
        severity: "review",
      },
      {
        id: "payout-drift",
        title: "Payout timing drift",
        description: "Pending transactions indicate funds are still waiting for finance review.",
        severity: "watch",
      },
      {
        id: "revenue-mix",
        title: "Revenue mix update",
        description: "Platform fee trends are generated directly from current transaction history.",
        severity: "insight",
      },
    ];

    res.json({
      success: true,
      data: {
        items,
        financeAlerts,
        totalShown: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputesSummary = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const escalationHours = Number(settings.disputeEscalationHours || 4);
    const threshold = Date.now() - escalationHours * 60 * 60 * 1000;
    const disputes = await Dispute.find().select("status createdAt");

    res.json({
      success: true,
      data: {
        open: disputes.filter((dispute) => String(dispute.status).toLowerCase() === "open").length,
        underReview: disputes.filter((dispute) => String(dispute.status).toLowerCase() === "under_review").length,
        highPriority: disputes.filter(
          (dispute) =>
            ["open", "under_review"].includes(String(dispute.status).toLowerCase()) &&
            new Date(dispute.createdAt).getTime() <= threshold
        ).length,
        resolved: disputes.filter((dispute) => String(dispute.status).toLowerCase() === "resolved").length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputes = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query || {};
    const disputes = await Dispute.find()
      .populate("bookingId", "_id")
      .populate("clientId", "name")
      .populate("providerId", "name")
      .sort({ createdAt: -1 });

    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const items = disputes
      .map(buildDisputeRow)
      .filter((dispute) => {
        if (normalizedStatus && normalizedStatus !== "all" && dispute.status !== normalizedStatus) {
          return false;
        }

        if (
          regex &&
          ![
            dispute.booking,
            dispute.client,
            dispute.provider,
            dispute.reason,
            dispute.description,
          ].some((value) => regex.test(String(value || "")))
        ) {
          return false;
        }

        return true;
      });

    res.json({
      success: true,
      data: {
        items,
        totalShown: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote = "" } = req.body || {};

    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (!["open", "under_review", "resolved", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dispute status.",
      });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      id,
      {
        status: normalizedStatus,
        resolutionNote: String(resolutionNote || "").trim(),
      },
      { new: true }
    )
      .populate("bookingId", "_id")
      .populate("clientId", "name")
      .populate("providerId", "name");

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found.",
      });
    }

    await recordAdminActivity(req, {
      action: "ADMIN_DISPUTE_STATUS_UPDATED",
      description: `Dispute ${id} moved to ${normalizedStatus}.`,
      module: "disputes",
      targetType: "Dispute",
      targetId: id,
      metadata: { status: normalizedStatus },
    });

    res.json({
      success: true,
      message: "Dispute updated successfully.",
      data: buildDisputeRow(dispute),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getContactMessages = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query || {};
    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();

    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    const items = messages
      .map((message) => ({
        id: String(message._id),
        name: message.name,
        email: message.email,
        subject: message.subject,
        message: message.message,
        category: message.category,
        status: message.status,
        createdAt: message.createdAt,
        createdLabel: formatDateTime(message.createdAt),
      }))
      .filter((message) => {
        if (normalizedStatus && normalizedStatus !== "all" && message.status !== normalizedStatus) {
          return false;
        }

        if (
          regex &&
          ![
            message.name,
            message.email,
            message.subject,
            message.message,
            message.category,
          ].some((value) => regex.test(String(value || "")))
        ) {
          return false;
        }

        return true;
      });

    res.json({
      success: true,
      data: {
        items,
        totalShown: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildSettingsResponse = ({ admin, settings }) => ({
  profile: {
    id: String(admin._id),
    name: admin.name || "",
    email: admin.email || "",
    phone: admin.phone || "",
    address: admin.address || "",
    profileImage: admin.profileImage || "",
  },
  platform: {
    platformName: settings.platformName || "GoLocal",
    supportEmail: settings.supportEmail || "support@golocal.com",
    currency: settings.currency || "INR",
    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage: settings.maintenanceMessage || DEFAULT_PLATFORM_SETTINGS.maintenanceMessage,
    commissionPercentage:
      Number(settings.commissionPercentage ?? settings.commissionRate ?? 10) || 10,
  },
  systemStatus: {
    database: "Connected",
    apiStatus: "Healthy",
    websocketMonitoring: Boolean(settings.websocketMonitoring),
  },
});

const getSettings = async (req, res) => {
  try {
    const [settings, admin] = await Promise.all([
      ensurePlatformSettings(),
      Admin.findById(req.user._id).select("-password"),
    ]);

    res.json({
      success: true,
      data: buildSettingsResponse({ admin, settings }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      profileImage,
      platformName,
      supportEmail,
      currency,
      maintenanceMode,
      maintenanceMessage,
      commissionPercentage,
    } = req.body || {};

    const adminUpdates = {};
    if (name !== undefined) adminUpdates.name = String(name).trim();
    if (email !== undefined) adminUpdates.email = String(email).trim().toLowerCase();
    if (phone !== undefined) adminUpdates.phone = String(phone).trim();
    if (address !== undefined) adminUpdates.address = String(address).trim();
    if (profileImage !== undefined) adminUpdates.profileImage = String(profileImage).trim();

    const platformUpdates = {};
    if (platformName !== undefined) platformUpdates.platformName = String(platformName).trim() || "GoLocal";
    if (supportEmail !== undefined) platformUpdates.supportEmail = String(supportEmail).trim().toLowerCase();
    if (currency !== undefined) platformUpdates.currency = String(currency).trim().toUpperCase();
    if (maintenanceMode !== undefined) platformUpdates.maintenanceMode = Boolean(maintenanceMode);
    if (maintenanceMessage !== undefined) {
      platformUpdates.maintenanceMessage =
        String(maintenanceMessage).trim() || DEFAULT_PLATFORM_SETTINGS.maintenanceMessage;
    }
    if (commissionPercentage !== undefined) {
      platformUpdates.commissionPercentage = Number(commissionPercentage);
      platformUpdates.commissionRate = Number(commissionPercentage);
    }

    const [admin, settings] = await Promise.all([
      Object.keys(adminUpdates).length
        ? Admin.findByIdAndUpdate(req.user._id, adminUpdates, {
            new: true,
            runValidators: true,
          }).select("-password")
        : Admin.findById(req.user._id).select("-password"),
      PlatformSetting.findOneAndUpdate({}, platformUpdates, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }),
    ]);

    await recordAdminActivity(req, {
      action: "ADMIN_SETTINGS_UPDATED",
      description: "Admin workspace settings were updated.",
      module: "settings",
      targetType: "PlatformSetting",
      targetId: settings._id,
      metadata: {
        platformUpdated: Object.keys(platformUpdates),
        profileUpdated: Object.keys(adminUpdates),
      },
    });

    res.json({
      success: true,
      message: "Settings saved successfully.",
      data: buildSettingsResponse({ admin, settings }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildAdvancedSettingsResponse = (settings) => ({
  controlDepth: settings.controlDepth || "High",
  automationProfile: settings.automationProfile || "Managed",
  reminderWindowLabel:
    settings.reminderWindowLabel || `${Number(settings.bookingReminderHours || 24)}h`,
  exportRetentionDays: Number(settings.exportRetentionDays || 30),
  manualProviderReview: Boolean(settings.manualProviderReview),
  disputeEscalationHours: Number(settings.disputeEscalationHours || 4),
  bookingReminderHours: Number(settings.bookingReminderHours || 24),
  websocketMonitoring: Boolean(settings.websocketMonitoring),
  guardrails: [
    {
      id: "manual-provider-review",
      title: "Manual provider review",
      value: Boolean(settings.manualProviderReview),
      label: Boolean(settings.manualProviderReview) ? "Enabled" : "Disabled",
    },
    {
      id: "admin-digest-notifications",
      title: "Admin digest notifications",
      value: true,
      label: "Enabled",
    },
    {
      id: "websocket-monitoring",
      title: "Websocket monitoring",
      value: Boolean(settings.websocketMonitoring),
      label: Boolean(settings.websocketMonitoring) ? "Monitored" : "Disabled",
    },
  ],
});

const getAdvancedSettings = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    res.json({
      success: true,
      data: buildAdvancedSettingsResponse(settings),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdvancedSettings = async (req, res) => {
  try {
    const {
      controlDepth,
      automationProfile,
      exportRetentionDays,
      manualProviderReview,
      disputeEscalationHours,
      bookingReminderHours,
      websocketMonitoring,
    } = req.body || {};

    const updates = {};
    if (controlDepth !== undefined) updates.controlDepth = String(controlDepth).trim();
    if (automationProfile !== undefined) updates.automationProfile = String(automationProfile).trim();
    if (exportRetentionDays !== undefined) updates.exportRetentionDays = Number(exportRetentionDays);
    if (manualProviderReview !== undefined) updates.manualProviderReview = Boolean(manualProviderReview);
    if (disputeEscalationHours !== undefined) updates.disputeEscalationHours = Number(disputeEscalationHours);
    if (bookingReminderHours !== undefined) {
      updates.bookingReminderHours = Number(bookingReminderHours);
      updates.reminderWindowLabel = `${Number(bookingReminderHours)}h`;
    }
    if (websocketMonitoring !== undefined) updates.websocketMonitoring = Boolean(websocketMonitoring);

    const settings = await PlatformSetting.findOneAndUpdate({}, updates, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });

    await recordAdminActivity(req, {
      action: "ADMIN_ADVANCED_SETTINGS_UPDATED",
      description: "Advanced admin settings were updated.",
      module: "settings",
      targetType: "PlatformSetting",
      targetId: settings._id,
      metadata: updates,
    });

    res.json({
      success: true,
      message: "Advanced settings saved successfully.",
      data: buildAdvancedSettingsResponse(settings),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCacheSettings = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const recentActivity = await ActivityLog.find({
      action: { $in: ["ADMIN_CACHE_REFRESHED", "ADMIN_CACHE_CLEARED"] },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          cacheLayersTracked: 4,
          cacheStore: "FILE",
          compiledViews: 0,
          lastClearedAt: settings.lastCacheClearedAt,
          lastClearedLabel: settings.lastCacheClearedAt
            ? formatDateTime(settings.lastCacheClearedAt)
            : "Not cleared yet",
        },
        layers: [
          {
            id: "application-cache",
            title: "Application Cache",
            description: "General platform lookups and repeated dashboard queries.",
            status: "Healthy",
          },
          {
            id: "configuration-cache",
            title: "Configuration Cache",
            description: "Environment and platform configuration snapshot.",
            status: "Live",
          },
          {
            id: "route-cache",
            title: "Route Cache",
            description: "Precompiled route definitions for faster admin requests.",
            status: "Live",
          },
          {
            id: "view-cache",
            title: "View Cache",
            description: "Compiled response fragments and dashboard views.",
            status: "Clean",
          },
        ],
        recentActivity: recentActivity.map((entry) => ({
          id: String(entry._id),
          action: entry.action,
          description: entry.description,
          createdAt: entry.createdAt,
          createdLabel: formatDateTime(entry.createdAt),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refreshCache = async (req, res) => {
  try {
    await recordAdminActivity(req, {
      action: "ADMIN_CACHE_REFRESHED",
      description: "Admin refreshed the cache overview.",
      module: "cache",
      targetType: "PlatformSetting",
      metadata: { refreshedAt: new Date().toISOString() },
    });

    res.json({
      success: true,
      message: "Cache overview refreshed successfully.",
      data: {
        refreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearCache = async (req, res) => {
  try {
    const settings = await PlatformSetting.findOneAndUpdate(
      {},
      { lastCacheClearedAt: new Date() },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    await recordAdminActivity(req, {
      action: "ADMIN_CACHE_CLEARED",
      description: "Admin cleared cached workspace data.",
      module: "cache",
      targetType: "PlatformSetting",
      targetId: settings._id,
      metadata: { lastCacheClearedAt: settings.lastCacheClearedAt },
    });

    res.json({
      success: true,
      message: "Cache cleared successfully.",
      data: {
        lastClearedAt: settings.lastCacheClearedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildExportRows = async (packageType) => {
  if (packageType === "users") {
    const [users, clients, providers] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }),
      Client.find(),
      Provider.find(),
    ]);
    const clientMap = new Map(clients.map((client) => [String(client.userId), client]));
    const providerMap = new Map(providers.map((provider) => [String(provider.userId), provider]));
    return users.map((user) => {
      const row = buildUserRow({
        user,
        clientProfile: clientMap.get(String(user._id)),
        providerProfile: providerMap.get(String(user._id)),
      });
      return {
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        approvalStatus: row.approvalStatus,
        joinedAt: row.joinedLabel,
      };
    });
  }

  if (packageType === "bookings") {
    const bookings = await Booking.find()
      .populate({
        path: "clientId",
        select: "name userId",
        populate: { path: "userId", select: "email" },
      })
      .populate({
        path: "providerId",
        select: "name userId",
        populate: { path: "userId", select: "email" },
      })
      .populate("serviceId", "title category")
      .sort({ createdAt: -1 });

    return bookings.map((booking) => {
      const row = buildBookingRow(booking);
      return {
        service: row.service,
        client: row.client,
        provider: row.provider,
        schedule: row.schedule,
        status: row.status,
        payment: row.paymentStatus,
        amount: row.amountLabel,
      };
    });
  }

  if (packageType === "disputes") {
    const disputes = await Dispute.find()
      .populate("bookingId", "_id")
      .populate("clientId", "name")
      .populate("providerId", "name")
      .sort({ createdAt: -1 });

    return disputes.map((dispute) => {
      const row = buildDisputeRow(dispute);
      return {
        booking: row.booking,
        client: row.client,
        provider: row.provider,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdLabel,
      };
    });
  }

  const [settings, totalUsers, totalBookings, totalTransactions, openDisputes] =
    await Promise.all([
      ensurePlatformSettings(),
      User.countDocuments(),
      Booking.countDocuments(),
      Transaction.countDocuments(),
      Dispute.countDocuments({ status: { $in: ["open", "under_review"] } }),
    ]);

  return [
    { metric: "Platform Name", value: settings.platformName || "GoLocal" },
    { metric: "Maintenance Mode", value: settings.maintenanceMode ? "Enabled" : "Disabled" },
    { metric: "Manual Provider Review", value: settings.manualProviderReview ? "Enabled" : "Disabled" },
    { metric: "Export Retention Days", value: Number(settings.exportRetentionDays || 30) },
    { metric: "Total Users", value: totalUsers },
    { metric: "Total Bookings", value: totalBookings },
    { metric: "Total Transactions", value: totalTransactions },
    { metric: "Open Disputes", value: openDisputes },
  ];
};

const getExportSettings = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const activity = await ActivityLog.find({
      action: "ADMIN_EXPORT_GENERATED",
    })
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({
      success: true,
      data: {
        summary: {
          exportBundles: Object.keys(EXPORT_PACKAGES).length,
          availableFormats: ["pdf", "csv"],
          lastExportedAt: settings.lastExportedAt,
          lastExportedLabel: settings.lastExportedAt
            ? formatDateTime(settings.lastExportedAt)
            : "Not exported yet",
          deliveryTarget: "Local device",
        },
        packages: Object.entries(EXPORT_PACKAGES).map(([key, config]) => ({
          id: key,
          title: config.title,
          filename: config.filename,
          supportedFormats: ["pdf", "csv"],
        })),
        recentActivity: activity.map((entry) => ({
          id: String(entry._id),
          title: entry.metadata?.title || "Admin export",
          format: String(entry.metadata?.format || "").toUpperCase(),
          fileName: entry.metadata?.fileName || "",
          createdAt: entry.createdAt,
          createdLabel: formatDateTime(entry.createdAt),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createExport = async (req, res) => {
  try {
    const packageType = String(req.body?.packageType || "").trim().toLowerCase();
    const format = String(req.body?.format || "").trim().toLowerCase();
    const exportConfig = EXPORT_PACKAGES[packageType];

    if (!exportConfig) {
      return res.status(400).json({
        success: false,
        message: "Invalid export package.",
      });
    }

    if (!["pdf", "csv"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "Only PDF and CSV exports are supported.",
      });
    }

    const rows = await buildExportRows(packageType);
    const buffer =
      format === "csv"
        ? buildCsvBuffer({ columns: exportConfig.columns, rows })
        : buildPdfBuffer({
            title: exportConfig.title,
            lines: rows.map((row) =>
              exportConfig.columns
                .map((column) => `${column.header}: ${row[column.key] ?? ""}`)
                .join(" | ")
            ),
          });

    const extension = format === "csv" ? "csv" : "pdf";
    const fileName = `${exportConfig.filename}-${Date.now()}.${extension}`;
    const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/pdf";

    const settings = await PlatformSetting.findOneAndUpdate(
      {},
      { lastExportedAt: new Date() },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    await recordAdminActivity(req, {
      action: "ADMIN_EXPORT_GENERATED",
      description: `${exportConfig.title} generated as ${format.toUpperCase()}.`,
      module: "export",
      targetType: "PlatformSetting",
      targetId: settings._id,
      metadata: {
        packageType,
        title: exportConfig.title,
        format,
        fileName,
        rows: rows.length,
      },
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSecuritySettings = async (req, res) => {
  try {
    const settings = await ensurePlatformSettings();
    const [adminAccounts, pendingApprovals, openDisputes, suspendedUsers, recentLogins] =
      await Promise.all([
        Admin.countDocuments(),
        User.countDocuments({ role: "provider", approvalStatus: "pending" }),
        Dispute.countDocuments({ status: { $in: ["open", "under_review"] } }),
        User.countDocuments({ status: "suspended" }),
        LoginHistory.find().sort({ loginTime: -1, createdAt: -1 }).limit(6),
      ]);

    res.json({
      success: true,
      data: {
        summary: {
          adminAccounts,
          pendingApprovals,
          openDisputes,
          suspendedUsers,
          lastAuditAt: settings.lastSecurityAuditAt,
          lastAuditLabel: settings.lastSecurityAuditAt
            ? formatDateTime(settings.lastSecurityAuditAt)
            : "Not run yet",
        },
        checklist: [
          {
            id: "privileged-access",
            title: "Privileged admin access review",
            description: "Review which users currently hold full operational access.",
            status: adminAccounts > 0 ? "Tight scope" : "Needs review",
          },
          {
            id: "approval-workflow",
            title: "Approval workflow verification",
            description: "Track accounts still waiting for manual review.",
            status: `${pendingApprovals} pending`,
          },
          {
            id: "dispute-oversight",
            title: "Dispute escalation oversight",
            description: "Escalated and open disputes affect trust, payouts, and support load.",
            status: openDisputes > 0 ? "Watchlist" : "Contained",
          },
          {
            id: "failed-payment-monitoring",
            title: "Failed payment monitoring",
            description: "Review failed logins and operational events from the security stream.",
            status: suspendedUsers > 0 ? "Investigate" : "Stable",
          },
        ],
        recentLogins: recentLogins.map((entry) => ({
          id: String(entry._id),
          account: entry.account,
          role: entry.role,
          success: Boolean(entry.success),
          loginTime: entry.loginTime,
          loginLabel: formatDateTime(entry.loginTime),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runSecurityAuditSnapshot = async (req, res) => {
  try {
    const settings = await PlatformSetting.findOneAndUpdate(
      {},
      { lastSecurityAuditAt: new Date() },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    await recordAdminActivity(req, {
      action: "ADMIN_SECURITY_AUDIT_SNAPSHOT",
      description: "Admin ran a security audit snapshot.",
      module: "security",
      targetType: "PlatformSetting",
      targetId: settings._id,
      metadata: { lastSecurityAuditAt: settings.lastSecurityAuditAt },
    });

    res.json({
      success: true,
      message: "Security audit snapshot completed.",
      data: {
        lastAuditAt: settings.lastSecurityAuditAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getUsers,
  updateUserStatus,
  getBookings,
  getBookingsSummary,
  getTransactions,
  getTransactionsSummary,
  getDisputes,
  getDisputesSummary,
  updateDisputeStatus,
  getContactMessages,
  getSettings,
  updateSettings,
  getAdvancedSettings,
  updateAdvancedSettings,
  getCacheSettings,
  refreshCache,
  clearCache,
  getExportSettings,
  createExport,
  getSecuritySettings,
  runSecurityAuditSnapshot,
};
