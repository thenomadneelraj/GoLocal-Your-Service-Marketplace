const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const User = require("../models/User");
const Service = require("../models/Service");
const PlatformSetting = require("../models/PlatformSetting");
const Transaction = require("../models/Transaction");
const Payout = require("../models/Payout");
const Review = require("../models/Review");
const Dispute = require("../models/Dispute");
const Client = require("../models/Client");
const { createNotification } = require("../services/notificationService");
const {
  APPROVAL_STATUS,
  isAccountActive,
  isProviderApproved,
} = require("../utils/accountState");
const {
  BOOKING_STATUS,
  normalizeBookingStatus,
  toBookingPersistenceStatus,
  isCompletedBooking,
} = require("../utils/bookingStatus");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");

const BOOKING_STATUS_TRANSITIONS = {
  [BOOKING_STATUS.PENDING]: [
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ACCEPTED]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.REJECTED]: [],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
};

const normalizeArea = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const doesAreaMatch = (provider, targetAddress) => {
  const providerAreas = [provider?.address, provider?.location]
    .map(normalizeArea)
    .filter(Boolean);
  const targetAreas = [targetAddress]
    .map(normalizeArea)
    .filter(Boolean);

  if (!providerAreas.length || !targetAreas.length) {
    return true;
  }

  return providerAreas.some((providerArea) =>
    targetAreas.some(
      (targetArea) =>
        providerArea === targetArea ||
        providerArea.includes(targetArea) ||
        targetArea.includes(providerArea)
    )
  );
};

const resolveBookingService = async ({ serviceId, provider, actualAmount }) => {
  if (serviceId && serviceId !== "default-service") {
    const explicitService = await Service.findById(serviceId);
    if (explicitService) {
      return explicitService;
    }
  }

  const existingService = await Service.findOne({ providerId: provider._id }).sort({
    createdAt: 1,
  });

  if (existingService) {
    return existingService;
  }

  const defaultTitle =
    provider.serviceType && provider.serviceType !== "Other"
      ? `${provider.serviceType} Service`
      : "General Service";

  return Service.create({
    title: defaultTitle,
    description: `Auto-generated default service for ${provider.name}.`,
    category: provider.serviceType || "Other",
    providerId: provider._id,
    price: Number(actualAmount) || Number(provider.hourlyRate) || 0,
    duration: "1 hour",
    locationType: "offline",
  });
};

const getCommissionPercentage = async () => {
  const settings = await PlatformSetting.findOne();
  return settings?.commissionPercentage ?? settings?.commissionRate ?? 10;
};

const recalculateProviderRating = async (providerId) => {
  if (!providerId) return;

  const providerObjectId =
    typeof providerId === "string"
      ? new Provider.db.base.Types.ObjectId(providerId)
      : providerId;

  const stats = await Review.aggregate([
    {
      $match: {
        providerId: providerObjectId,
      },
    },
    {
      $group: {
        _id: "$providerId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const nextRating = stats[0]?.averageRating
    ? Number(stats[0].averageRating.toFixed(1))
    : 0;
  const totalReviews = Number(stats[0]?.totalReviews || 0);

  await Provider.findByIdAndUpdate(providerId, {
    rating: nextRating,
    totalReviews,
  });
};

const serializeReview = (review) => ({
  id: review?._id,
  bookingId: review?.bookingId?._id || review?.bookingId,
  rating: Number(review?.rating || 0),
  comment: review?.comment || "",
  createdAt: review?.createdAt,
  updatedAt: review?.updatedAt,
  serviceTitle: review?.serviceId?.title || "",
  clientName: review?.clientId?.name || "Client",
  clientProfileImage: review?.clientId?.profileImage || "",
});

// CREATE booking (and associated transaction + payout)
const createBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      providerId,
      serviceId,
      scheduledAt,
      bookingDate,
      timeSlot,
      address,
      notes,
      totalAmount,
      price,
      paymentMethod,
    } = req.body;

    const actualAmount = totalAmount || price;
    const actualDate = scheduledAt ? new Date(scheduledAt) : (bookingDate ? new Date(bookingDate) : new Date());
    const actualTimeSlot = timeSlot || "Flexible";

    if (!providerId || !address || !actualAmount) {
      return res.status(400).json({
        success: false,
        message: "providerId, address and amount are required.",
      });
    }

    const client = await Client.findOne({ userId });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found for this user.",
      });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    const providerUser = await User.findById(provider.userId).select(
      "role status approvalStatus isActive"
    );
    if (providerUser && !isAccountActive(providerUser)) {
      return res.status(409).json({
        success: false,
        message: "Provider account is currently disabled.",
      });
    }

    if (!isProviderApproved({ user: providerUser, provider })) {
      return res.status(409).json({
        success: false,
        message:
          providerUser?.approvalStatus === APPROVAL_STATUS.REJECTED
            ? "Provider account has been rejected."
            : "Provider is not approved for bookings yet.",
      });
    }

    if (!provider.availability) {
      return res.status(409).json({
        success: false,
        message: "Provider is currently unavailable.",
      });
    }

    if (!doesAreaMatch(provider, address)) {
      return res.status(409).json({
        success: false,
        message: "Provider is unavailable for the selected address.",
      });
    }

    const startOfBookingDay = new Date(
      actualDate.getFullYear(),
      actualDate.getMonth(),
      actualDate.getDate()
    );
    const endOfBookingDay = new Date(
      actualDate.getFullYear(),
      actualDate.getMonth(),
      actualDate.getDate() + 1
    );

    const conflictingBooking = await Booking.findOne({
      providerId,
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED, "confirmed"] },
      timeSlot: actualTimeSlot,
      bookingDate: { $gte: startOfBookingDay, $lt: endOfBookingDay },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: "Provider is busy for the selected date and time. Please choose another slot.",
      });
    }

    const service = await resolveBookingService({
      serviceId,
      provider,
      actualAmount,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    const booking = await Booking.create({
      clientId: client._id,
      providerId,
      serviceId: service._id,
      bookingDate: actualDate,
      timeSlot: actualTimeSlot,
      address,
      notes: notes || undefined, // Add notes field to schema if needed, skipping for now if it's not strictly schema
      price: actualAmount,
      status: BOOKING_STATUS.PENDING,
      paymentStatus: "paid",
    });

    const commissionPercentage = await getCommissionPercentage();
    const commissionAmount = Math.round(
      (Number(actualAmount) * Number(commissionPercentage)) / 100
    );
    const netAmount = Number(actualAmount) - commissionAmount;

    const transaction = await Transaction.create({
      bookingId: booking._id,
      clientId: client._id,
      amount: actualAmount,
      status: "success",
      paymentMethod: paymentMethod || "card",
    });

    const payout = await Payout.create({
      providerId,
      bookingId: booking._id,
      amount: actualAmount,
      commission: commissionAmount,
      netAmount,
      status: "pending",
    });

    if (provider.userId) {
      await createNotification({
        userId: provider.userId,
        title: `New booking request from ${client.name}`,
        message: `${client.name} requested ${service.title || provider.serviceType || "a service"} for ${actualTimeSlot}.`,
        type: "booking",
        actionUrl: "/provider/booking-management",
        metadata: {
          bookingId: booking._id.toString(),
          clientId: client._id.toString(),
          providerId: provider._id.toString(),
          status: BOOKING_STATUS.PENDING,
        },
      });

      emitSocketEvent({
        userIds: [provider.userId],
        eventName: SOCKET_EVENTS.BOOKING_CREATED,
        payload: {
          bookingId: booking._id,
          status: BOOKING_STATUS.PENDING,
          message: `New booking request from ${client.name}`,
          booking: {
            id: booking._id,
            bookingDate: booking.bookingDate,
            timeSlot: booking.timeSlot,
            price: booking.price,
          },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Booking request submitted successfully.",
      data: { booking, transaction, payout },
    });
  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    let filter = {};
    if (req.user.role === "provider" || req.user.role === "PROVIDER") {
      const providerProfile = await Provider.findOne({ userId: req.user._id });
      if (providerProfile) filter = { providerId: providerProfile._id };
      else filter = { providerId: null };
    } else if (req.user.role === "admin" || req.user.role === "ADMIN") {
      filter = {};
    } else {
      const clientProfile = await Client.findOne({ userId: req.user._id });
      if (clientProfile) filter = { clientId: clientProfile._id };
      else filter = { clientId: null };
    }

    if (req.query.status) {
      filter.status = toBookingPersistenceStatus(req.query.status);
    }

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate({
          path: "providerId",
          select:
            "name phone profileImage serviceType location hourlyRate userId bio experience rating totalReviews isApproved availability address",
          populate: {
            path: "userId",
            select: "email role status approvalStatus isActive",
          },
        })
        .populate({
          path: "clientId",
          select: "name phone profileImage address userId",
          populate: {
            path: "userId",
            select: "email role status approvalStatus isActive",
          },
        })
        .populate("serviceId", "title category price")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const bookingIds = items.map((item) => item._id);
    const reviews = bookingIds.length
      ? await Review.find({ bookingId: { $in: bookingIds } })
          .populate("clientId", "name profileImage")
          .populate("serviceId", "title")
      : [];

    const reviewMap = new Map(
      reviews.map((review) => [String(review.bookingId), serializeReview(review)])
    );

    const hydratedItems = items.map((item) => {
      const plain = item.toObject ? item.toObject() : item;
      return {
        ...plain,
        status: normalizeBookingStatus(plain.status),
        review: reviewMap.get(String(item._id)) || null,
      };
    });

    res.json({
      success: true,
      data: {
        items: hydratedItems,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CHANGE booking status (simplified)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = toBookingPersistenceStatus(req.body?.status);

    if (!BOOKING_STATUS_TRANSITIONS[nextStatus]) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status.",
      });
    }

    const booking = await Booking.findById(id).populate("clientId", "userId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const actorRole = String(req.user?.role || "").trim().toLowerCase();
    const currentStatus = normalizeBookingStatus(booking.status);

    if (actorRole === "provider") {
      const providerProfile = await Provider.findOne({ userId: req.user._id }).select("_id");

      if (!providerProfile || String(booking.providerId) !== String(providerProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own booking requests.",
        });
      }

      if (
        currentStatus !== nextStatus &&
        !BOOKING_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)
      ) {
        return res.status(409).json({
          success: false,
          message: `A ${currentStatus || "booking"} request cannot be moved to ${nextStatus}.`,
        });
      }
    } else if (actorRole === "client") {
      const clientProfile = await Client.findOne({ userId: req.user._id }).select("_id");

      if (!clientProfile || String(booking.clientId?._id || booking.clientId) !== String(clientProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own bookings.",
        });
      }

      if (nextStatus !== BOOKING_STATUS.CANCELLED) {
        return res.status(403).json({
          success: false,
          message: "Clients can only cancel their bookings.",
        });
      }

      if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED].includes(currentStatus)) {
        return res.status(409).json({
          success: false,
          message: "Only pending or accepted bookings can be cancelled.",
        });
      }
    } else if (actorRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this booking.",
      });
    }

    booking.status = nextStatus;
    await booking.save();
    await booking.populate([
      {
        path: "providerId",
        select:
          "name phone profileImage serviceType location hourlyRate userId bio experience rating totalReviews isApproved availability address",
        populate: {
          path: "userId",
          select: "email role status approvalStatus isActive",
        },
      },
      {
        path: "clientId",
        select: "name phone profileImage address userId",
        populate: {
          path: "userId",
          select: "email role status approvalStatus isActive",
        },
      },
      {
        path: "serviceId",
        select: "title category price",
      },
    ]);

    const normalizedNextStatus = normalizeBookingStatus(booking.status);
    const providerUserId = booking.providerId?.userId?._id || booking.providerId?.userId;
    const clientUserId = booking.clientId?.userId?._id || booking.clientId?.userId;

    if (clientUserId) {
      await createNotification({
        userId: clientUserId,
        title: "Booking request updated",
        message: `Your booking is now ${normalizedNextStatus}.`,
        type: "booking",
        actionUrl: "/client/bookings",
        metadata: {
          bookingId: booking._id.toString(),
          status: normalizedNextStatus,
        },
      });
    }

    emitSocketEvent({
      userIds: [clientUserId, providerUserId],
      eventName: SOCKET_EVENTS.BOOKING_UPDATED,
      payload: {
        bookingId: booking._id,
        status: normalizedNextStatus,
        message: `Your booking status has been updated to ${normalizedNextStatus}`,
        booking,
      },
    });

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE review for a booking
const createBookingReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const numericRating = Number(rating);
    const trimmedComment = String(comment || "").trim();

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const client = await Client.findOne({ userId: req.user._id });
    if (!client || booking.clientId.toString() !== client._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own bookings.",
      });
    }

    if (!isCompletedBooking(booking.status)) {
      return res.status(409).json({
        success: false,
        message: "You can review a provider after the booking is completed.",
      });
    }

    const existingReview = await Review.findOne({ bookingId: booking._id });

    if (
      existingReview &&
      String(existingReview.clientId) !== String(client._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "This booking review already belongs to another client.",
      });
    }

    const review = existingReview
      ? await Review.findByIdAndUpdate(
          existingReview._id,
          {
            rating: numericRating,
            comment: trimmedComment,
          },
          { new: true }
        )
      : await Review.create({
          bookingId: booking._id,
          clientId: booking.clientId,
          providerId: booking.providerId,
          serviceId: booking.serviceId,
          rating: numericRating,
          comment: trimmedComment,
        });

    await recalculateProviderRating(booking.providerId);

    const populatedReview = await Review.findById(review._id)
      .populate("clientId", "name profileImage")
      .populate("serviceId", "title");

    res.status(201).json({
      success: true,
      message: existingReview
        ? "Review updated successfully."
        : "Review submitted successfully.",
      data: serializeReview(populatedReview),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE dispute for a booking
const createBookingDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const client = await Client.findOne({ userId: req.user._id });
    // Assuming providers could also create disputes? We'll let both through here but strictly require clientId/providerId.
    const actualClientId = client ? client._id : booking.clientId; 

    const dispute = await Dispute.create({
      bookingId: booking._id,
      clientId: booking.clientId,
      providerId: booking.providerId,
      reason,
      description: description || "No description provided",
    });

    res.status(201).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  updateBookingStatus,
  createBookingReview,
  createBookingDispute,
};
