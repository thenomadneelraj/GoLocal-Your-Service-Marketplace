const User = require("../models/User");
const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const { createNotification } = require("../services/notificationService");
const { emitSocketEvent, SOCKET_EVENTS } = require("../utils/socketEvents");

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

const buildThreadTitle = (item) => {
  if (item.targetType === "platform") {
    return "Website & Platform Support";
  }

  return item.targetUserId?.name || item.providerId?.name || item.clientId?.name || "Dispute";
};

const serializeDispute = (dispute, currentUserId = "") => {
  const reporterId = String(dispute.reporterId?._id || dispute.reporterId || "");
  const clientId = String(dispute.clientId?._id || dispute.clientId || "");
  const providerId = String(dispute.providerId?._id || dispute.providerId || "");
  const targetUserId = String(
    dispute.targetUserId?._id || dispute.targetUserId || ""
  );
  const isReporter = String(currentUserId) === reporterId;
  const roleLabel =
    isReporter
      ? "reported by you"
      : String(currentUserId) === clientId
        ? "reported against provider"
        : String(currentUserId) === providerId
          ? "reported against client"
          : "reported";

  return {
    id: String(dispute._id),
    threadKey: dispute.threadKey || `dispute:${String(dispute._id)}`,
    targetType: dispute.targetType || "provider",
    subject: dispute.subject || dispute.reason || "Dispute",
    reason: dispute.reason || "",
    description: dispute.description || "",
    status: String(dispute.status || "open").toLowerCase(),
    resolutionNote: dispute.resolutionNote || "",
    createdAt: dispute.createdAt,
    createdLabel: formatDateTime(dispute.createdAt),
    reporterId,
    reporterName: dispute.reporterId?.name || "User",
    bookingId: dispute.bookingId?._id || null,
    bookingLabel: dispute.bookingId?._id
      ? `#${String(dispute.bookingId._id).slice(-6)}`
      : "Platform",
    providerId,
    providerName: dispute.providerId?.name || "Provider",
    clientId,
    clientName: dispute.clientId?.name || "Client",
    targetUserId,
    targetUserName:
      dispute.targetUserId?.name ||
      dispute.providerId?.name ||
      dispute.clientId?.name ||
      "Admin",
    threadTitle: buildThreadTitle(dispute),
    roleLabel,
  };
};

const notifyAdmins = async ({ dispute, actionUrl = "/admin/disputes" }) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        title: "New dispute filed",
        message: `${dispute.reporterId?.name || "A user"} opened a ${
          dispute.targetType === "platform" ? "platform" : "service"
        } dispute.`,
        type: "dispute",
        actionUrl,
        metadata: {
          disputeId: String(dispute._id),
          threadKey: dispute.threadKey,
        },
      })
    )
  );
};

const listDisputes = async (req, res) => {
  try {
    const currentUserId = String(req.user._id);
    const view = String(req.query?.view || "threads").trim().toLowerCase();
    const items = await Dispute.find({
      $or: [
        { reporterId: req.user._id },
        { clientId: req.user._id },
        { providerId: req.user._id },
        { targetUserId: req.user._id },
      ],
    })
      .populate("reporterId", "name role")
      .populate("clientId", "name role")
      .populate("providerId", "name role")
      .populate("targetUserId", "name role")
      .populate("bookingId", "_id bookingDate timeSlot price")
      .sort({ createdAt: -1 });

    const serialized = items.map((item) => serializeDispute(item, currentUserId));

    if (view === "items") {
      return res.json({
        success: true,
        data: {
          items: serialized,
          total: serialized.length,
        },
      });
    }

    const grouped = serialized.reduce((accumulator, item) => {
      const existing = accumulator.get(item.threadKey) || {
        id: item.threadKey,
        threadKey: item.threadKey,
        threadTitle: item.threadTitle,
        targetType: item.targetType,
        status: item.status,
        latestAt: item.createdAt,
        latestLabel: item.createdLabel,
        items: [],
      };

      existing.items.push(item);
      if (new Date(item.createdAt) > new Date(existing.latestAt || 0)) {
        existing.latestAt = item.createdAt;
        existing.latestLabel = item.createdLabel;
        existing.status = item.status;
      }

      accumulator.set(item.threadKey, existing);
      return accumulator;
    }, new Map());

    const threads = [...grouped.values()].sort(
      (left, right) => new Date(right.latestAt || 0) - new Date(left.latestAt || 0)
    );

    res.json({
      success: true,
      data: {
        threads,
        totalThreads: threads.length,
        totalItems: serialized.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createDispute = async (req, res) => {
  try {
    const reporter = await User.findById(req.user._id).select("name role");
    if (!reporter) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    const targetType = "platform";
    const reason = String(req.body?.reason || "").trim();
    const description = String(req.body?.description || "").trim();
    const subject = String(req.body?.subject || reason || "Dispute").trim();
    const bookingId = String(req.body?.bookingId || "").trim();

    if (!reason || !description) {
      return res.status(400).json({
        success: false,
        message: "reason and description are required.",
      });
    }

    let booking = null;
    let clientId = null;
    let providerId = null;
    let targetUserId = null;
    let threadKey = "";

    threadKey = `platform:${String(reporter._id)}`;

    const existingOpenDispute = await Dispute.findOne({
      reporterId: reporter._id,
      bookingId: booking?._id,
      targetType,
      status: { $in: ["open", "under_review", "escalated"] },
    });

    if (existingOpenDispute) {
      return res.status(409).json({
        success: false,
        message: "An active dispute already exists for this workflow.",
      });
    }

    const dispute = await Dispute.create({
      bookingId: booking?._id,
      reporterId: reporter._id,
      clientId,
      providerId,
      targetUserId,
      targetType,
      threadKey,
      subject,
      reason,
      description,
      status: "open",
    });

    await dispute.populate([
      { path: "reporterId", select: "name role" },
      { path: "clientId", select: "name role" },
      { path: "providerId", select: "name role" },
      { path: "targetUserId", select: "name role" },
      { path: "bookingId", select: "_id bookingDate timeSlot price" },
    ]);

    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        title: "New dispute filed",
        message: `${reporter.name} filed a dispute involving you.`,
        type: "dispute",
        actionUrl:
          String(reporter.role || "").toLowerCase() === "client"
            ? "/provider/disputes"
            : "/client/disputes",
        metadata: {
          disputeId: String(dispute._id),
          threadKey,
        },
      });
    }

    await notifyAdmins({ dispute });

    emitSocketEvent({
      userIds: [targetUserId, clientId, providerId].filter(Boolean),
      eventName: SOCKET_EVENTS.DISPUTE_CREATED,
      payload: {
        disputeId: dispute._id,
        bookingId: dispute.bookingId?._id || null,
        reason,
        status: "open",
        threadKey,
      },
    });

    res.status(201).json({
      success: true,
      message: "Dispute filed successfully.",
      data: {
        dispute: serializeDispute(dispute, String(req.user._id)),
      },
    });
  } catch (error) {
    console.error("createDispute error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  listDisputes,
  createDispute,
};
