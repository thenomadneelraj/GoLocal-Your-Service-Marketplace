const Client = require("../models/Client");
const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
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

const listDisputes = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user._id }).select("_id");
    if (!client) {
      return res.json({
        success: true,
        data: {
          items: [],
          total: 0,
        },
      });
    }

    const disputes = await Dispute.find({ clientId: client._id })
      .populate("providerId", "name serviceType profileImage")
      .populate({
        path: "bookingId",
        select: "bookingDate timeSlot price serviceId",
        populate: {
          path: "serviceId",
          select: "title category",
        },
      })
      .sort({ createdAt: -1 });

    const items = disputes.map((dispute) => ({
      id: dispute._id,
      reason: dispute.reason,
      description: dispute.description,
      status: String(dispute.status || "open").toLowerCase(),
      resolutionNote: dispute.resolutionNote || "",
      createdAt: dispute.createdAt,
      createdLabel: formatDateTime(dispute.createdAt),
      bookingId: dispute.bookingId?._id || null,
      bookingDate: dispute.bookingId?.bookingDate || null,
      timeSlot: dispute.bookingId?.timeSlot || "",
      amount: Number(dispute.bookingId?.price || 0),
      serviceTitle:
        dispute.bookingId?.serviceId?.title ||
        dispute.providerId?.serviceType ||
        "Service",
      providerName: dispute.providerId?.name || "Provider",
      providerServiceType: dispute.providerId?.serviceType || "Service",
      providerProfileImage: dispute.providerId?.profileImage || "",
    }));

    res.json({
      success: true,
      data: {
        items,
        total: items.length,
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
    const userId = req.user._id;
    const { bookingId, reason, description } = req.body;

    if (!bookingId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: "bookingId, reason, and description are required.",
      });
    }

    const client = await Client.findOne({ userId }).select("_id");
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("providerId")
      .populate("clientId");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      String(booking.clientId._id) !== String(client._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only file disputes for your own bookings.",
      });
    }

    const existingDispute = await Dispute.findOne({ bookingId });
    if (existingDispute) {
      return res.status(409).json({
        success: false,
        message: "A dispute has already been filed for this booking.",
      });
    }

    const dispute = await Dispute.create({
      bookingId,
      clientId: client._id,
      providerId: booking.providerId._id,
      reason,
      description,
      status: "open",
    });

    await dispute.populate([
      {
        path: "providerId",
        select: "name serviceType profileImage userId",
      },
      {
        path: "bookingId",
        select: "bookingDate timeSlot price serviceId",
        populate: {
          path: "serviceId",
          select: "title category",
        },
      },
    ]);

    // Create notification for admin
    await createNotification({
      userId: null,
      title: `New Dispute: ${reason}`,
      message: `${client.name} filed a dispute against ${booking.providerId.name} for booking on ${new Date(booking.bookingDate).toLocaleDateString("en-IN")}.`,
      type: "dispute",
      actionUrl: `/admin/disputes`,
      metadata: {
        disputeId: dispute._id.toString(),
        bookingId: booking._id.toString(),
        providerId: booking.providerId._id.toString(),
        clientId: client._id.toString(),
      },
    });

    // Emit socket event
    emitSocketEvent({
      eventName: SOCKET_EVENTS.DISPUTE_CREATED,
      payload: {
        disputeId: dispute._id,
        bookingId: booking._id,
        reason,
        status: "open",
      },
    });

    res.status(201).json({
      success: true,
      message: "Dispute filed successfully. Our team will review it shortly.",
      data: { dispute },
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
