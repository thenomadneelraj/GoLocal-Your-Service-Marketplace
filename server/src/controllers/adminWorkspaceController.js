const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Dispute = require("../models/Dispute");
const Service = require("../models/Service");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const adminService = require("../services/adminService");
const {
  DEFAULT_PLATFORM_SETTINGS,
  getPlatformSettings,
  getPrimaryAdmin,
  updatePlatformSettings,
} = require("../services/platformSettingsService");
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
const {
  normalizeTransactionStatus,
  isPaidTransaction,
  isPendingTransaction,
} = require("../utils/transactionStatus");
const {
  buildCsvBuffer,
  buildPdfBuffer,
  buildXlsxBuffer,
} = require("../utils/adminExport");
const {
  getMockAdminExportRows,
  mergeLayeredExportRows,
} = require("../utils/mockAdminExportData");
const {
  VERIFICATION_STATUS,
  normalizeVerificationStatus,
  getRequiredVerificationDocumentKinds,
  VERIFICATION_DOCUMENT_LABELS,
  serializeVerificationDocument,
} = require("../utils/verification");
const { createNotification } = require("../services/notificationService");
const { emitSocketEvent, SOCKET_EVENTS } = require("../utils/socketEvents");
const { deleteVerificationDocuments } = require("../utils/verificationFiles");

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
      { header: "Type", key: "type" },
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
      { header: "Type", key: "type" },
    ],
  },
  transactions: {
    title: "Transactions Export",
    filename: "transaction-center",
    columns: [
      { header: "Reference", key: "reference" },
      { header: "Provider", key: "provider" },
      { header: "Service", key: "service" },
      { header: "Client Paid", key: "clientPaid" },
      { header: "Platform Fee", key: "platformFee" },
      { header: "Status", key: "status" },
      { header: "Created At", key: "createdAt" },
      { header: "Type", key: "type" },
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
      { header: "Type", key: "type" },
    ],
  },
  compliance: {
    title: "Compliance Archive",
    filename: "compliance-archive",
    columns: [
      { header: "Metric", key: "metric" },
      { header: "Value", key: "value" },
      { header: "Type", key: "type" },
    ],
  },
};

const buildRegex = (value = "") =>
  value
    ? new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;

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
    });
  }
  return labels;
};

const toMonthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const buildUserRow = (user) => {
  const role = String(user?.role || "").toLowerCase();
  const status = normalizeUserStatus(user?.status, user?.isActive);
  const approvalStatus = normalizeApprovalStatus(user?.approvalStatus, {
    role,
    status,
  });

  const name = user?.name || user?.email?.split("@")?.[0] || "Unnamed User";

  return {
    id: String(user._id),
    name,
    email: user.email,
    role,
    status,
    approvalStatus,
    isApproved: approvalStatus === APPROVAL_STATUS.APPROVED,
    phone: user?.phone || "",
    address: user?.address || "",
    serviceType: role === "provider" ? user?.serviceType || "" : "",
    providerProfileId: role === "provider" ? String(user._id) : "",
    isVerified: Boolean(user?.isVerified),
    verificationStatus: normalizeVerificationStatus(
      user?.verification?.status,
      user?.isVerified
    ),
    verificationDocumentsCount: Array.isArray(user?.verification?.documents)
      ? user.verification.documents.length
      : 0,
    verificationSubmittedAt: user?.verification?.submittedAt || null,
    verificationSubmittedLabel: user?.verification?.submittedAt
      ? formatDateTime(user.verification.submittedAt)
      : "",
    verificationReviewedAt: user?.verification?.reviewedAt || null,
    verificationReviewedLabel: user?.verification?.reviewedAt
      ? formatDateTime(user.verification.reviewedAt)
      : "",
    verificationRejectionReason: user?.verification?.rejectionReason || "",
    joinedAt: user.createdAt,
    joinedLabel: formatDateTime(user.createdAt),
    avatar: user?.profileImage || "",
  };
};

const buildVerificationDocuments = (user) =>
  Array.isArray(user?.verification?.documents)
    ? user.verification.documents.map((document) =>
        serializeVerificationDocument(document)
      )
    : [];

const buildVerificationRequestRow = (user) => ({
  ...buildUserRow(user),
  requiredDocuments: getRequiredVerificationDocumentKinds(user?.role).map((kind) => ({
    kind,
    label: VERIFICATION_DOCUMENT_LABELS[kind] || "Document",
  })),
  verificationDocuments: buildVerificationDocuments(user),
});

const buildBookingRow = (booking, currency = "USD") => {
  const status = normalizeBookingStatus(booking.status);
  return {
    id: String(booking._id),
    service: booking.serviceId?.title || "Service",
    category: booking.serviceId?.category || "General",
    client: booking.clientId?.name || "Client",
    clientEmail: booking.clientId?.email || "",
    provider: booking.providerId?.name || "Provider",
    providerEmail: booking.providerId?.email || "",
    schedule: formatDateTime(booking.bookingDate),
    timeSlot: booking.timeSlot,
    status,
    paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
    amount: booking.price || 0,
    amountLabel: formatCurrency(booking.price || 0, currency),
  };
};

const buildDisputeThreadTitle = (dispute) => {
  if (String(dispute.targetType || "").toLowerCase() === "platform") {
    return `${dispute.reporterId?.name || "User"} - Website support`;
  }

  return (
    dispute.targetUserId?.name ||
    dispute.providerId?.name ||
    dispute.clientId?.name ||
    "Dispute thread"
  );
};

const serializeAdminDispute = (dispute) => {
  const bookingId = dispute.bookingId?._id || dispute.bookingId || null;

  return {
    id: String(dispute._id),
    threadKey: dispute.threadKey || `dispute:${String(dispute._id)}`,
    threadTitle: buildDisputeThreadTitle(dispute),
    booking: bookingId ? `#${String(bookingId).slice(-6)}` : "Platform",
    bookingLabel: bookingId ? `#${String(bookingId).slice(-6)}` : "Platform",
    bookingId,
    client: dispute.clientId?.name || "Client",
    provider: dispute.providerId?.name || "Provider",
    reporterName:
      dispute.reporterId?.name ||
      dispute.clientId?.name ||
      dispute.providerId?.name ||
      "User",
    reporterRole: String(dispute.reporterId?.role || "").toLowerCase() || "user",
    targetUserName:
      dispute.targetUserId?.name ||
      (String(dispute.targetType || "").toLowerCase() === "platform"
        ? "Platform"
        : dispute.providerId?.name || dispute.clientId?.name || "User"),
    targetUserRole:
      String(dispute.targetUserId?.role || "").toLowerCase() ||
      (String(dispute.targetType || "").toLowerCase() === "platform"
        ? "platform"
        : "user"),
    targetType: String(dispute.targetType || "provider").toLowerCase(),
    subject: dispute.subject || dispute.reason || "Dispute",
    reason: dispute.reason,
    description: dispute.description,
    status: String(dispute.status || "open").toLowerCase(),
    resolutionNote: dispute.resolutionNote || "",
    createdAt: dispute.createdAt,
    createdLabel: formatDateTime(dispute.createdAt),
  };
};

const buildDisputeRow = (dispute) => serializeAdminDispute(dispute);

const buildTransactionRow = (transaction, commissionPercentage = 10, currency = "USD") => {
  const baseAmount = Number(transaction.baseAmount || transaction.amount || 0);
  const clientPaid = Number(transaction.totalPaidByClient || transaction.amount || 0);
  const platformFee =
    Number(transaction.platformRevenue || 0) ||
    Number(transaction.clientPlatformFee || 0) +
      Number(transaction.providerPlatformFee || 0) ||
    (baseAmount * Number(commissionPercentage || 10) * 2) / 100;
  const status = normalizeTransactionStatus(transaction.status);
  const settled = isPaidTransaction(status);

  return {
    id: String(transaction._id),
    reference:
      transaction.transactionId ||
      `TX-${String(transaction._id).slice(-5).toUpperCase()}`,
    provider:
      transaction.providerId?.name ||
      transaction.bookingId?.providerId?.name ||
      "Provider",
    service:
      transaction.serviceSnapshot?.services
        ?.map((service) => service.title)
        .filter(Boolean)
        .join(", ") ||
      transaction.serviceSnapshot?.title ||
      transaction.bookingId?.serviceId?.title ||
      transaction.bookingId?.serviceId?.name ||
      "Service",
    amount: clientPaid,
    amountLabel: formatCurrency(clientPaid, currency),
    baseAmount,
    baseAmountLabel: formatCurrency(baseAmount, currency),
    platformFee,
    platformFeeLabel: formatCurrency(platformFee, currency),
    clientUpiId: transaction.clientPaymentSnapshot?.upiId || "",
    clientBankName: transaction.clientPaymentSnapshot?.bankName || "",
    providerUpiId: transaction.providerPaymentSnapshot?.upiId || "",
    providerBankName: transaction.providerPaymentSnapshot?.bankName || "",
    status,
    statusLabel: settled
      ? "settled"
      : isPendingTransaction(status)
        ? "pending hold"
        : status,
    createdAt: transaction.createdAt,
    createdLabel: formatDateTime(transaction.createdAt),
  };
};

const buildSettingsResponse = ({ user, settings }) => ({
  profile: {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    profileImage: user?.profileImage || "",
  },
  platform: {
    platformName: settings.platformName || DEFAULT_PLATFORM_SETTINGS.platformName,
    supportEmail: settings.supportEmail || DEFAULT_PLATFORM_SETTINGS.supportEmail,
    currency: settings.currency || DEFAULT_PLATFORM_SETTINGS.currency,
    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage:
      settings.maintenanceMessage || DEFAULT_PLATFORM_SETTINGS.maintenanceMessage,
    commissionPercentage: Number(
      settings.commissionPercentage ?? DEFAULT_PLATFORM_SETTINGS.commissionPercentage
    ),
  },
  systemStatus: {
    database: "Connected",
    apiStatus: "Healthy",
    websocketMonitoring: Boolean(settings.websocketMonitoring),
  },
});

const buildAdvancedSettingsResponse = (settings) => ({
  controlDepth: settings.controlDepth || DEFAULT_PLATFORM_SETTINGS.controlDepth,
  automationProfile:
    settings.automationProfile || DEFAULT_PLATFORM_SETTINGS.automationProfile,
  reminderWindowLabel:
    settings.reminderWindowLabel ||
    `${Number(settings.bookingReminderHours || DEFAULT_PLATFORM_SETTINGS.bookingReminderHours)}h`,
  exportRetentionDays: Number(
    settings.exportRetentionDays || DEFAULT_PLATFORM_SETTINGS.exportRetentionDays
  ),
  manualProviderReview:
    settings.manualProviderReview ?? DEFAULT_PLATFORM_SETTINGS.manualProviderReview,
  disputeEscalationHours: Number(
    settings.disputeEscalationHours || DEFAULT_PLATFORM_SETTINGS.disputeEscalationHours
  ),
  bookingReminderHours: Number(
    settings.bookingReminderHours || DEFAULT_PLATFORM_SETTINGS.bookingReminderHours
  ),
  websocketMonitoring:
    settings.websocketMonitoring ?? DEFAULT_PLATFORM_SETTINGS.websocketMonitoring,
  guardrails: [
    {
      id: "manual-provider-review",
      title: "Manual provider review",
      value: Boolean(settings.manualProviderReview ?? DEFAULT_PLATFORM_SETTINGS.manualProviderReview),
      label:
        settings.manualProviderReview ?? DEFAULT_PLATFORM_SETTINGS.manualProviderReview
          ? "Enabled"
          : "Disabled",
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
      value: Boolean(settings.websocketMonitoring ?? DEFAULT_PLATFORM_SETTINGS.websocketMonitoring),
      label:
        settings.websocketMonitoring ?? DEFAULT_PLATFORM_SETTINGS.websocketMonitoring
          ? "Monitored"
          : "Disabled",
    },
  ],
});

const getDashboard = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    const currency = settings.currency || "USD";
    const [
      users,
      bookings,
      transactions,
      services,
      openDisputes,
    ] = await Promise.all([
      User.find({ role: { $ne: "admin" } }).select("role approvalStatus createdAt"),
      Booking.find().sort({ createdAt: 1 }).select("status price createdAt"),
      Transaction.find()
        .sort({ createdAt: 1 })
        .select("status amount platformRevenue createdAt"),
      Service.find().select("category"),
      Dispute.countDocuments({ status: { $in: ["open", "under_review", "escalated"] } }),
    ]);

    const totalRevenue = transactions
      .filter((transaction) => isPaidTransaction(transaction.status))
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.platformRevenue || 0),
        0
      );

    const monthLabels = getMonthLabels(6);
    const growth = monthLabels.map((month) => ({
      month: month.label,
      users: 0,
      revenue: 0,
      bookings: 0,
    }));

    const monthIndex = new Map(monthLabels.map((month, index) => [month.key, index]));

    users.forEach((user) => {
      const index = monthIndex.get(toMonthKey(user.createdAt));
      if (index !== undefined) {
        growth[index].users += 1;
      }
    });

    transactions.forEach((transaction) => {
      const index = monthIndex.get(toMonthKey(transaction.createdAt));
      if (index !== undefined && isPaidTransaction(transaction.status)) {
        growth[index].revenue += Number(transaction.platformRevenue || 0);
      }
    });

    bookings.forEach((booking) => {
      const index = monthIndex.get(toMonthKey(booking.createdAt));
      if (index !== undefined) {
        growth[index].bookings += 1;
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
          totalUsers: users.length,
          pendingProviders: users.filter(
            (user) =>
              String(user.role || "").toLowerCase() === "provider" &&
              String(user.approvalStatus || "").toLowerCase() === APPROVAL_STATUS.PENDING
          ).length,
          revenue: totalRevenue,
          bookingsTracked: bookings.length,
          openDisputes,
        },
        charts: {
          growth: growth.map((item) => ({
            ...item,
            revenue: Number(item.revenue.toFixed(2)),
          })),
          categoryDistribution: Object.entries(categoryCounts).map(([name, value]) => ({
            name,
            value,
          })),
        },
        meta: {
          currency,
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
    const users = await User.find({ role: { $ne: "admin" } }).select("-password").sort({ createdAt: -1 });
    const rows = users.map((user) => buildUserRow(user));

    const regex = buildRegex(search);
    const normalizedRole = String(role || "").trim().toLowerCase();
    const normalizedStatus = String(status || "").trim().toLowerCase();

    const filteredItems = rows.filter((item) => {
      if (normalizedRole && normalizedRole !== "all" && item.role !== normalizedRole) {
        return false;
      }

      if (normalizedStatus && normalizedStatus !== "all") {
        if (![item.status, item.approvalStatus].includes(normalizedStatus)) {
          return false;
        }
      }

      if (
        regex &&
        ![item.name, item.email, item.phone, item.serviceType]
          .filter(Boolean)
          .some((value) => regex.test(String(value)))
      ) {
        return false;
      }

      return true;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers: filteredItems.length,
          pendingApproval: filteredItems.filter((item) => item.approvalStatus === APPROVAL_STATUS.PENDING).length,
          approved: filteredItems.filter((item) => item.approvalStatus === APPROVAL_STATUS.APPROVED).length,
          rejected: filteredItems.filter(
            (item) =>
              item.approvalStatus === APPROVAL_STATUS.REJECTED ||
              item.status === USER_STATUS.REJECTED
          ).length,
          suspended: filteredItems.filter((item) => item.status === USER_STATUS.SUSPENDED).length,
        },
        items: filteredItems,
        totalShown: filteredItems.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVerificationRequests = async (req, res) => {
  try {
    const { search = "", role = "", status = "" } = req.query || {};
    const users = await User.find({
      role: { $ne: "admin" },
      "verification.documents.0": { $exists: true },
    })
      .select("-password")
      .sort({ "verification.submittedAt": -1, createdAt: -1 });

    const rows = users.map((user) => buildVerificationRequestRow(user));
    const regex = buildRegex(search);
    const normalizedRole = String(role || "").trim().toLowerCase();
    const normalizedStatus = String(status || "").trim().toLowerCase();

    const filteredItems = rows.filter((item) => {
      if (normalizedRole && normalizedRole !== "all" && item.role !== normalizedRole) {
        return false;
      }

      if (
        normalizedStatus &&
        normalizedStatus !== "all" &&
        item.verificationStatus !== normalizedStatus
      ) {
        return false;
      }

      if (
        regex &&
        ![item.name, item.email, item.phone, item.serviceType]
          .filter(Boolean)
          .some((value) => regex.test(String(value)))
      ) {
        return false;
      }

      return true;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests: rows.length,
          underReview: rows.filter(
            (item) => item.verificationStatus === VERIFICATION_STATUS.UNDER_REVIEW
          ).length,
          verified: rows.filter(
            (item) => item.verificationStatus === VERIFICATION_STATUS.VERIFIED
          ).length,
          rejected: rows.filter(
            (item) => item.verificationStatus === VERIFICATION_STATUS.REJECTED
          ).length,
        },
        items: filteredItems,
        totalShown: filteredItems.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVerificationRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({
      _id: id,
      role: { $ne: "admin" },
      "verification.documents.0": { $exists: true },
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found.",
      });
    }

    return res.json({
      success: true,
      data: buildVerificationRequestRow(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

    if (existingUser.isMock) {
      const nextStatus =
        requestedStatus === "approved"
          ? USER_STATUS.ACTIVE
          : requestedStatus === "rejected"
            ? USER_STATUS.REJECTED
            : requestedStatus === "suspended"
              ? USER_STATUS.SUSPENDED
              : normalizeUserStatus(requestedStatus, existingUser.isActive);
      const nextApprovalStatus =
        requestedStatus === "approved"
          ? APPROVAL_STATUS.APPROVED
          : requestedStatus === "rejected"
            ? APPROVAL_STATUS.REJECTED
            : existingUser.approvalStatus;

      const nextUser = await User.findByIdAndUpdate(
        id,
        {
          status: nextStatus,
          isActive: nextStatus === USER_STATUS.ACTIVE,
          approvalStatus: nextApprovalStatus,
        },
        { new: true, runValidators: true }
      ).select("-password");

      emitSocketEvent({
        rooms: ["role_admin"],
        eventName: SOCKET_EVENTS.USER_STATUS_UPDATED,
        payload: {
          userId: id,
          status: nextStatus,
          approvalStatus: nextApprovalStatus,
          dataOrigin: "mock",
          isMock: true,
          message: "Mock user status updated.",
        },
      });

      return res.json({
        success: true,
        message: "Mock user status updated successfully.",
        data: buildUserRow(nextUser),
        meta: { source: "mock" },
      });
    }

    // Prevent admins from rejecting/deleting themselves
    if (
      requestedStatus === "rejected" &&
      String(existingUser._id) === String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot reject your own account.",
      });
    }

    // "Rejected" means permanent removal — delete the user and associated data
    if (requestedStatus === "rejected") {
      const userName = existingUser.name || existingUser.email;
      const userRole = existingUser.role;
      const verificationDocuments = Array.isArray(existingUser.verification?.documents)
        ? existingUser.verification.documents
        : [];

      // Clean up related data
      await Promise.allSettled([
        Notification.deleteMany({ user: id }),
        Booking.deleteMany({
          $or: [{ clientId: id }, { providerId: id }],
        }),
      ]);
      await deleteVerificationDocuments(verificationDocuments);

      await User.findByIdAndDelete(id);

      return res.json({
        success: true,
        message: `User "${userName}" (${userRole}) has been permanently removed.`,
        data: null,
      });
    }

    let nextUser = null;

    if (
      String(existingUser.role || "").toLowerCase() === "provider" &&
      ["approved", "pending"].includes(requestedStatus)
    ) {
      nextUser = await adminService.updateProviderStatus(id, requestedStatus);
    } else {
      nextUser = await adminService.updateUserStatus(id, {
        status: requestedStatus === "approved" ? USER_STATUS.ACTIVE : requestedStatus,
        approvalStatus:
          requestedStatus === "approved"
            ? APPROVAL_STATUS.APPROVED
            : existingUser.approvalStatus,
      });
    }

    res.json({
      success: true,
      message: "User status updated successfully.",
      data: buildUserRow(nextUser),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVerificationRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedStatus = String(req.body?.verificationStatus || "")
      .trim()
      .toLowerCase();

    if (!requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "verificationStatus is required.",
      });
    }

    if (
      ![
        VERIFICATION_STATUS.UNDER_REVIEW,
        VERIFICATION_STATUS.VERIFIED,
        VERIFICATION_STATUS.REJECTED,
      ].includes(requestedStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status.",
      });
    }

    const nextUser = await adminService.updateUserVerificationStatus(
      id,
      requestedStatus,
      req.body?.rejectionReason || "",
      req.user?._id || null
    );

    res.json({
      success: true,
      message:
        requestedStatus === VERIFICATION_STATUS.VERIFIED
          ? "User documents are successfully verified."
          : "Verification updated successfully.",
      data: buildVerificationRequestRow(nextUser),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUserVerificationStatus = async (req, res) =>
  updateVerificationRequestStatus(req, res);

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
    const settings = await getPlatformSettings();
    const currency = settings.currency || "USD";

    const bookings = await Booking.find()
      .populate("clientId", "name email")
      .populate("providerId", "name email serviceType")
      .populate("serviceId", "title category")
      .sort({ createdAt: -1 });

    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const items = bookings
      .map((booking) => buildBookingRow(booking, currency))
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
          ]
            .filter(Boolean)
            .some((value) => regex.test(String(value)))
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

const buildFinanceAlerts = ({ transactions = [], disputes = [] }) => {
  const pendingHolds = transactions.filter((transaction) =>
    isPendingTransaction(transaction.status)
  ).length;
  const failedPayments = transactions.filter(
    (transaction) => normalizeTransactionStatus(transaction.status) === "failed"
  ).length;
  const openDisputes = disputes.filter((dispute) =>
    ["open", "under_review", "escalated"].includes(String(dispute.status || "").toLowerCase())
  ).length;

  const alerts = [];

  if (pendingHolds > 0) {
    alerts.push({
      id: "pending-holds",
      title: "Pending payment holds",
      description: `${pendingHolds} transaction${pendingHolds === 1 ? "" : "s"} still waiting for settlement.`,
      severity: "watchlist",
    });
  }

  if (failedPayments > 0) {
    alerts.push({
      id: "failed-payments",
      title: "Failed payment follow-up",
      description: `${failedPayments} payment${failedPayments === 1 ? "" : "s"} need finance review.`,
      severity: "investigate",
    });
  }

  if (openDisputes > 0) {
    alerts.push({
      id: "dispute-impact",
      title: "Dispute-linked revenue risk",
      description: `${openDisputes} open dispute${openDisputes === 1 ? "" : "s"} may affect settlements.`,
      severity: "elevated",
    });
  }

  return alerts;
};

const getTransactionsSummary = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    const transactions = await Transaction.find().select(
      "amount totalPaidByClient platformRevenue status"
    );

    const grossVolume = transactions.reduce(
      (sum, transaction) =>
        sum + Number(transaction.totalPaidByClient || transaction.amount || 0),
      0
    );
    const platformFees = transactions
      .filter((transaction) => isPaidTransaction(transaction.status))
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.platformRevenue || 0),
        0
      );
    const pendingHolds = transactions
      .filter((transaction) => isPendingTransaction(transaction.status))
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.totalPaidByClient || transaction.amount || 0),
        0
      );
    const failedCount = transactions.filter(
      (transaction) => normalizeTransactionStatus(transaction.status) === "failed"
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
        currency: settings.currency || "USD",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query || {};
    const settings = await getPlatformSettings();
    const commissionPercentage = Number(settings.commissionPercentage || 10);
    const currency = settings.currency || "USD";

    const [transactions, disputes] = await Promise.all([
      Transaction.find()
        .populate("providerId", "name serviceType")
        .populate({
          path: "bookingId",
          select: "providerId serviceId",
          populate: [
            { path: "providerId", select: "name serviceType" },
            { path: "serviceId", select: "title" },
          ],
        })
        .sort({ createdAt: -1 }),
      Dispute.find().select("status"),
    ]);

    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const items = transactions
      .map((transaction) =>
        buildTransactionRow(transaction, commissionPercentage, currency)
      )
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
          ]
            .filter(Boolean)
            .some((value) => regex.test(String(value)))
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
        financeAlerts: buildFinanceAlerts({ transactions, disputes }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const downloadTransactionInvoice = async (req, res) => {
  try {
    const format = String(req.query?.format || "pdf").trim().toLowerCase();
    const settings = await getPlatformSettings();
    const currency = settings.currency || "USD";
    const transaction = await Transaction.findById(req.params.id)
      .populate("providerId", "name")
      .populate({
        path: "bookingId",
        select: "serviceId",
        populate: { path: "serviceId", select: "title" },
      });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    const row = buildTransactionRow(transaction, settings.commissionPercentage, currency);
    const columns = [
      { header: "Transaction", key: "reference" },
      { header: "Provider", key: "provider" },
      { header: "Work", key: "service" },
      { header: "Client Paid", key: "amountLabel" },
      { header: "Base Amount", key: "baseAmountLabel" },
      { header: "Platform Revenue", key: "platformFeeLabel" },
      { header: "Client UPI ID", key: "clientUpiId" },
      { header: "Client Bank Name", key: "clientBankName" },
      { header: "Provider UPI ID", key: "providerUpiId" },
      { header: "Provider Bank Name", key: "providerBankName" },
      { header: "Status", key: "statusLabel" },
      { header: "Created At", key: "createdLabel" },
    ];

    let buffer;
    let contentType = "application/pdf";
    let extension = "pdf";

    if (format === "xlsx") {
      buffer = buildXlsxBuffer({
        columns,
        rows: [row],
        sheetName: "Transaction Invoice",
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
        title: `Admin Invoice ${row.reference}`,
        lines: [
          `Provider: ${row.provider}`,
          `Work: ${row.service}`,
          `Client Paid: ${row.amountLabel}`,
          `Base Amount: ${row.baseAmountLabel}`,
          `Platform Revenue: ${row.platformFeeLabel}`,
          `Client UPI ID: ${row.clientUpiId || "Not available"}`,
          `Client Bank Name: ${row.clientBankName || "Not available"}`,
          `Provider UPI ID: ${row.providerUpiId || "Not available"}`,
          `Provider Bank Name: ${row.providerBankName || "Not available"}`,
          `Status: ${row.statusLabel}`,
          `Created At: ${row.createdLabel}`,
        ],
      });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admin-transaction-${row.reference}.${extension}"`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputesSummary = async (req, res) => {
  try {
    const disputes = await Dispute.find().select("status reason");
    const underReviewCount = disputes.filter((dispute) =>
      ["under_review", "escalated"].includes(String(dispute.status || "").toLowerCase())
    ).length;

    res.json({
      success: true,
      data: {
        open: disputes.filter((dispute) => String(dispute.status || "").toLowerCase() === "open").length,
        underReview: underReviewCount,
        highPriority: underReviewCount,
        resolved: disputes.filter((dispute) => String(dispute.status || "").toLowerCase() === "resolved").length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputes = async (req, res) => {
  try {
    const { search = "", status = "", view = "items" } = req.query || {};

    const disputes = await Dispute.find()
      .populate("bookingId", "_id")
      .populate("clientId", "name role")
      .populate("providerId", "name role")
      .populate("reporterId", "name role")
      .populate("targetUserId", "name role")
      .sort({ createdAt: -1 });

    const regex = buildRegex(search);
    const normalizedStatus = String(status || "").trim().toLowerCase();
    const normalizedView = String(view || "items").trim().toLowerCase();
    const items = disputes
      .map(serializeAdminDispute)
      .filter((dispute) => {
        if (normalizedStatus && normalizedStatus !== "all" && dispute.status !== normalizedStatus) {
          return false;
        }

        if (
          regex &&
          ![
            dispute.subject,
            dispute.booking,
            dispute.client,
            dispute.provider,
            dispute.reporterName,
            dispute.targetUserName,
            dispute.targetType,
            dispute.reason,
            dispute.description,
          ]
            .filter(Boolean)
            .some((value) => regex.test(String(value)))
        ) {
          return false;
        }

          return true;
        });

    if (normalizedView === "threads") {
      const threads = [...items.reduce((accumulator, item) => {
        const existing = accumulator.get(item.threadKey) || {
          id: item.threadKey,
          threadKey: item.threadKey,
          threadTitle: item.threadTitle,
          targetType: item.targetType,
          status: item.status,
          latestAt: item.createdAt,
          latestLabel: item.createdLabel,
          reporterName: item.reporterName,
          targetUserName: item.targetUserName,
          items: [],
        };

        existing.items.push(item);

        if (new Date(item.createdAt) >= new Date(existing.latestAt || 0)) {
          existing.latestAt = item.createdAt;
          existing.latestLabel = item.createdLabel;
          existing.status = item.status;
        }

        accumulator.set(item.threadKey, existing);
        return accumulator;
      }, new Map()).values()].sort(
        (left, right) => new Date(right.latestAt || 0) - new Date(left.latestAt || 0)
      );

      return res.json({
        success: true,
        data: {
          threads,
          totalShown: threads.length,
          totalItems: items.length,
        },
      });
    }

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
    const { status, resolutionNote } = req.body || {};
    const normalizedStatus = String(status || "").trim().toLowerCase();

    const dispute = await Dispute.findById(id)
      .populate("reporterId", "name role")
      .populate("targetUserId", "name role")
      .populate("clientId", "name")
      .populate("providerId", "name");
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found.",
      });
    }

    dispute.status = normalizedStatus || dispute.status;
    if (resolutionNote !== undefined) {
      dispute.resolutionNote = String(resolutionNote || "").trim();
    }
    dispute.resolvedAt = normalizedStatus === "resolved" ? new Date() : dispute.resolvedAt;
    await dispute.save();

    const recipientIds = [
      dispute.clientId?._id,
      dispute.providerId?._id,
    ].filter(Boolean);

    await Promise.all(
      recipientIds.map((userId) =>
        createNotification({
          userId,
          title: "Dispute updated",
          message: `A dispute is now ${normalizedStatus || dispute.status}.`,
          type: "dispute",
          actionUrl: String(userId) === String(dispute.clientId?._id) ? "/client/disputes" : "/provider/disputes",
          metadata: {
            disputeId: dispute._id.toString(),
            status: dispute.status,
          },
        })
      )
    );

    emitSocketEvent({
      userIds: recipientIds,
      eventName: SOCKET_EVENTS.DISPUTE_UPDATED,
      payload: {
        disputeId: dispute._id,
        status: dispute.status,
      },
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
    res.json({
      success: true,
      data: {
        items: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const [user, settings] = await Promise.all([
      User.findById(req.user._id).select("-password"),
      getPlatformSettings(),
    ]);

    res.json({
      success: true,
      data: buildSettingsResponse({ user, settings }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPublicSettings = async (req, res) => {
  try {
    const settings = await getPlatformSettings();

    res.json({
      success: true,
      data: {
        platformName: settings.platformName || DEFAULT_PLATFORM_SETTINGS.platformName,
        currency: settings.currency || DEFAULT_PLATFORM_SETTINGS.currency,
        commissionPercentage: Number(
          settings.commissionPercentage ?? DEFAULT_PLATFORM_SETTINGS.commissionPercentage
        ),
        maintenanceMode: Boolean(settings.maintenanceMode),
        maintenanceMessage:
          settings.maintenanceMessage || DEFAULT_PLATFORM_SETTINGS.maintenanceMessage,
      },
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
    if (platformName !== undefined) platformUpdates.platformName = String(platformName).trim() || DEFAULT_PLATFORM_SETTINGS.platformName;
    if (supportEmail !== undefined) platformUpdates.supportEmail = String(supportEmail).trim().toLowerCase();
    if (currency !== undefined) platformUpdates.currency = String(currency).trim().toUpperCase();
    if (maintenanceMode !== undefined) platformUpdates.maintenanceMode = Boolean(maintenanceMode);
    if (maintenanceMessage !== undefined) {
      platformUpdates.maintenanceMessage =
        String(maintenanceMessage).trim() || DEFAULT_PLATFORM_SETTINGS.maintenanceMessage;
    }
    if (commissionPercentage !== undefined) {
      const commissionValue = Number(commissionPercentage);
      // Ensure the value is a valid number between 0 and 100
      if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
        return res.status(400).json({
          success: false,
          message: "Commission percentage must be a number between 0 and 100.",
        });
      }
      // Ensure we always save a number, not a string
      platformUpdates.commissionPercentage = Number(commissionValue.toFixed(2));
    }

    const [user, settings] = await Promise.all([
      Object.keys(adminUpdates).length
        ? User.findByIdAndUpdate(req.user._id, adminUpdates, {
            new: true,
            runValidators: true,
          }).select("-password")
        : User.findById(req.user._id).select("-password"),
      updatePlatformSettings(platformUpdates, req.user._id),
    ]);

    res.json({
      success: true,
      message: "Settings saved successfully.",
      data: buildSettingsResponse({ user, settings }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdvancedSettings = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
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

    const settings = await updatePlatformSettings(updates, req.user._id);

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
    const settings = await getPlatformSettings();

    res.json({
      success: true,
      data: {
        summary: {
          cacheLayersTracked: 4,
          cacheStore: "MEMORY",
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
            description: "Environment and embedded admin platform settings.",
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
        recentActivity: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refreshCache = async (req, res) => {
  try {
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
    const settings = await updatePlatformSettings(
      { lastCacheClearedAt: new Date() },
      req.user._id
    );

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
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    const realRows = users.map((user) => {
      const row = buildUserRow(user);
      return {
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        approvalStatus: row.approvalStatus,
        joinedAt: row.joinedLabel,
        type: "real",
        activityAt: row.joinedAt,
      };
    });

    return mergeLayeredExportRows(realRows, getMockAdminExportRows(packageType));
  }

  if (packageType === "bookings") {
    const settings = await getPlatformSettings();
    const currency = settings.currency || "USD";
    const bookings = await Booking.find()
      .populate("clientId", "name email")
      .populate("providerId", "name email")
      .populate("serviceId", "title category")
      .sort({ createdAt: -1 });

    const realRows = bookings.map((booking) => {
      const row = buildBookingRow(booking, currency);
      return {
        service: row.service,
        client: row.client,
        provider: row.provider,
        schedule: row.schedule,
        status: row.status,
        payment: row.paymentStatus,
        amount: row.amountLabel,
        type: "real",
        activityAt: booking.createdAt,
      };
    });

    return mergeLayeredExportRows(realRows, getMockAdminExportRows(packageType));
  }

  if (packageType === "transactions") {
    const settings = await getPlatformSettings();
    const commissionPercentage = Number(settings.commissionPercentage || 10);
    const currency = settings.currency || "USD";
    const transactions = await Transaction.find()
      .populate("providerId", "name serviceType")
      .populate({
        path: "bookingId",
        select: "providerId serviceId",
        populate: [
          { path: "providerId", select: "name serviceType" },
          { path: "serviceId", select: "title" },
        ],
      })
      .sort({ createdAt: -1 });

    const realRows = transactions.map((transaction) => {
      const row = buildTransactionRow(transaction, commissionPercentage, currency);
      return {
        reference: row.reference,
        provider: row.provider,
        service: row.service,
        clientPaid: row.amountLabel,
        platformFee: row.platformFeeLabel,
        status: row.statusLabel,
        createdAt: row.createdLabel,
        type: "real",
        activityAt: transaction.createdAt,
      };
    });

    return mergeLayeredExportRows(realRows, getMockAdminExportRows(packageType));
  }

  if (packageType === "disputes") {
    const disputes = await Dispute.find()
      .populate("bookingId", "_id")
      .populate("clientId", "name")
      .populate("providerId", "name")
      .sort({ createdAt: -1 });

    const realRows = disputes.map((dispute) => {
      const row = buildDisputeRow(dispute);
      return {
        booking: row.booking,
        client: row.client,
        provider: row.provider,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdLabel,
        type: "real",
        activityAt: dispute.createdAt,
      };
    });

    return mergeLayeredExportRows(realRows, getMockAdminExportRows(packageType));
  }

  const settings = await getPlatformSettings();
  const [totalUsers, totalBookings, totalTransactions, openDisputes] =
    await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Transaction.countDocuments(),
      Dispute.countDocuments({ status: { $in: ["open", "under_review", "escalated"] } }),
    ]);

  const realRows = [
    { metric: "Platform Name", value: settings.platformName || DEFAULT_PLATFORM_SETTINGS.platformName },
    { metric: "Maintenance Mode", value: settings.maintenanceMode ? "Enabled" : "Disabled" },
    { metric: "Manual Provider Review", value: settings.manualProviderReview ? "Enabled" : "Disabled" },
    { metric: "Export Retention Days", value: Number(settings.exportRetentionDays || DEFAULT_PLATFORM_SETTINGS.exportRetentionDays) },
    { metric: "Total Users", value: totalUsers },
    { metric: "Total Bookings", value: totalBookings },
    { metric: "Total Transactions", value: totalTransactions },
    { metric: "Open Disputes", value: openDisputes },
  ].map((row, index) => ({
    ...row,
    type: "real",
    activityAt: new Date(Date.now() - index * 60000).toISOString(),
  }));

  return mergeLayeredExportRows(realRows, getMockAdminExportRows(packageType));
};

const getExportSettings = async (req, res) => {
  try {
    const settings = await getPlatformSettings();

    res.json({
      success: true,
      data: {
        summary: {
          exportBundles: Object.keys(EXPORT_PACKAGES).length,
          availableFormats: ["pdf", "csv", "xlsx"],
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
          supportedFormats: ["pdf", "csv", "xlsx"],
        })),
        recentActivity: [],
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

    if (!["pdf", "csv", "xlsx"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "Only PDF, CSV, and XLSX exports are supported.",
      });
    }

    const rows = await buildExportRows(packageType);
    const buffer =
      format === "csv"
        ? buildCsvBuffer({ columns: exportConfig.columns, rows })
        : format === "xlsx"
          ? buildXlsxBuffer({
              columns: exportConfig.columns,
              rows,
              sheetName: exportConfig.title,
            })
          : buildPdfBuffer({
            title: exportConfig.title,
            lines: rows.map((row) =>
              exportConfig.columns
                .map((column) => `${column.header}: ${row[column.key] ?? ""}`)
                .join(" | ")
            ),
          });

    const extension =
      format === "csv" ? "csv" : format === "xlsx" ? "xlsx" : "pdf";
    const fileName = `${exportConfig.filename}-${Date.now()}.${extension}`;
    const contentType =
      format === "csv"
        ? "text/csv; charset=utf-8"
        : format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";

    await updatePlatformSettings({ lastExportedAt: new Date() }, req.user._id);

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
    const settings = await getPlatformSettings();
    const [users, disputes] = await Promise.all([
      User.find().select("role approvalStatus status totalLogins lastLogin"),
      Dispute.find().select("status"),
    ]);

    const adminAccounts = users.filter((user) => String(user.role || "").toLowerCase() === "admin").length;
    const pendingApprovals = users.filter(
      (user) =>
        String(user.role || "").toLowerCase() === "provider" &&
        String(user.approvalStatus || "").toLowerCase() === APPROVAL_STATUS.PENDING
    ).length;
    const openDisputes = disputes.filter((dispute) =>
      ["open", "under_review", "escalated"].includes(String(dispute.status || "").toLowerCase())
    ).length;
    const suspendedUsers = users.filter(
      (user) => String(user.status || "").toLowerCase() === USER_STATUS.SUSPENDED
    ).length;

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
            description: "Review suspended users and unresolved payment issues from the core collections.",
            status: suspendedUsers > 0 ? "Investigate" : "Stable",
          },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runSecurityAuditSnapshot = async (req, res) => {
  try {
    const settings = await updatePlatformSettings(
      { lastSecurityAuditAt: new Date() },
      req.user._id
    );

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
  getVerificationRequests,
  getVerificationRequestById,
  updateUserStatus,
  updateVerificationRequestStatus,
  updateUserVerificationStatus,
  getBookings,
  getBookingsSummary,
  getTransactions,
  getTransactionsSummary,
  downloadTransactionInvoice,
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
  getPublicSettings,
};
