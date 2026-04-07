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
const { findOrCreateConversation } = require("../services/conversationService");
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

const BOOKING_POPULATION = [
  {
    path: "providerId",
    select:
      "name phone upiId profileImage serviceType location hourlyRate userId bio experience rating totalReviews isApproved availability address",
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
    select: "title category price duration locationType",
  },
];

const BOOKING_STATUS_TRANSITIONS = {
  [BOOKING_STATUS.PENDING_PAYMENT]: [BOOKING_STATUS.CANCELLED],
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

const BLOCKING_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.ACCEPTED,
  "confirmed",
];

const normalizeArea = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizePaymentMethod = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["upi", "cod", "card", "cash"].includes(normalized)
    ? normalized
    : "upi";
};

const formatDateLabel = (value) => {
  if (!value) return "scheduled service";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "scheduled service";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const doesAreaMatch = (provider, targetAddress) => {
  const providerAreas = [provider?.address, provider?.location]
    .map(normalizeArea)
    .filter(Boolean);
  const targetAreas = [targetAddress].map(normalizeArea).filter(Boolean);

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

const hydrateBooking = async (bookingId) =>
  Booking.findById(bookingId).populate(BOOKING_POPULATION);

const getBookingDayRange = (value) => {
  const date = new Date(value);
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
  };
};

const ensureProviderAvailabilityForBooking = async ({
  provider,
  providerUser,
  address,
}) => {
  if (providerUser && !isAccountActive(providerUser)) {
    return "Provider account is currently disabled.";
  }

  if (!isProviderApproved({ user: providerUser, provider })) {
    return providerUser?.approvalStatus === APPROVAL_STATUS.REJECTED
      ? "Provider account has been rejected."
      : "Provider is not approved for bookings yet.";
  }

  if (!provider.availability) {
    return "Provider is currently unavailable.";
  }

  if (!doesAreaMatch(provider, address)) {
    return "Provider is unavailable for the selected address.";
  }

  return "";
};

const findConflictingBooking = async ({
  providerId,
  bookingDate,
  timeSlot,
  excludeBookingId = "",
}) => {
  const { start, end } = getBookingDayRange(bookingDate);
  const filter = {
    providerId,
    status: { $in: BLOCKING_BOOKING_STATUSES },
    timeSlot,
    bookingDate: { $gte: start, $lt: end },
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(filter);
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

const buildBookingSummaryPayload = (booking) => ({
  id: booking._id,
  bookingDate: booking.bookingDate,
  timeSlot: booking.timeSlot,
  price: booking.price,
  status: normalizeBookingStatus(booking.status),
  paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
  paymentMethod: booking.paymentMethod || "upi",
});

const createProviderBookingNotification = async ({
  booking,
  client,
  provider,
  service,
}) => {
  if (!provider?.userId) {
    return;
  }

  await createNotification({
    userId: provider.userId,
    title: `New booking request from ${client.name}`,
    message: `${client.name} requested ${
      service.title || provider.serviceType || "a service"
    } for ${formatDateLabel(booking.bookingDate)} at ${booking.timeSlot}.`,
    type: "booking",
    actionUrl: "/provider/booking-management",
    metadata: {
      bookingId: booking._id.toString(),
      clientId: client._id.toString(),
      providerId: provider._id.toString(),
      status: normalizeBookingStatus(booking.status),
      paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
    },
  });
};

const createClientPaymentNotification = async ({
  userId,
  booking,
  service,
  paymentMethod,
}) => {
  await createNotification({
    userId,
    title: "Payment recorded",
    message:
      paymentMethod === "cod"
        ? `Cash on delivery selected for ${service.title || "your booking"}.`
        : `Payment confirmed for ${service.title || "your booking"}.`,
    type: "payment",
    actionUrl: "/client/payments",
    metadata: {
      bookingId: booking._id.toString(),
      paymentMethod,
      paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
    },
  });
};

const createTransactionAndMaybePayout = async ({
  booking,
  client,
  provider,
  paymentMethod,
}) => {
  const transactionStatus = paymentMethod === "upi" ? "success" : "pending";

  const transaction = await Transaction.create({
    bookingId: booking._id,
    clientId: client._id,
    amount: booking.price,
    status: transactionStatus,
    paymentMethod,
    transactionId:
      paymentMethod === "upi"
        ? `UPI-${String(booking._id).slice(-8).toUpperCase()}`
        : `COD-${String(booking._id).slice(-8).toUpperCase()}`,
  });

  let payout = null;
  if (paymentMethod === "upi") {
    const commissionPercentage = await getCommissionPercentage();
    const commissionAmount = Math.round(
      (Number(booking.price) * Number(commissionPercentage)) / 100
    );
    const netAmount = Number(booking.price) - commissionAmount;

    payout = await Payout.create({
      providerId: provider._id,
      bookingId: booking._id,
      amount: booking.price,
      commission: commissionAmount,
      netAmount,
      status: "pending",
    });
  }

  return { transaction, payout };
};

const emitBookingAndPaymentEvents = ({
  booking,
  clientUserId,
  providerUserId,
  transaction,
}) => {
  emitSocketEvent({
    userIds: [clientUserId, providerUserId],
    eventName: SOCKET_EVENTS.BOOKING_CREATED,
    payload: {
      bookingId: booking._id,
      status: normalizeBookingStatus(booking.status),
      message: "Booking request submitted successfully.",
      booking: buildBookingSummaryPayload(booking),
    },
  });

  if (transaction) {
    emitSocketEvent({
      userIds: [clientUserId, providerUserId],
      eventName: SOCKET_EVENTS.TRANSACTION_CREATED,
      payload: {
        transactionId: transaction._id,
        bookingId: booking._id,
        amount: Number(transaction.amount || 0),
        status: String(transaction.status || "pending").toLowerCase(),
        paymentMethod: transaction.paymentMethod || "upi",
      },
    });
  }
};

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
      requirements,
      totalAmount,
      price,
      paymentMethod,
    } = req.body;

    const actualAmount = Number(totalAmount || price || 0);
    const actualDate = scheduledAt
      ? new Date(scheduledAt)
      : bookingDate
        ? new Date(bookingDate)
        : new Date();
    const actualTimeSlot = String(timeSlot || "Flexible").trim();
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
    const trimmedAddress = String(address || "").trim();
    const trimmedNotes = String(notes || "").trim();
    const trimmedRequirements = String(
      requirements || trimmedNotes || ""
    ).trim();

    if (!providerId || !trimmedAddress || !actualAmount || !trimmedRequirements) {
      return res.status(400).json({
        success: false,
        message:
          "providerId, address, amount, and required work details are required.",
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

    const providerAvailabilityError = await ensureProviderAvailabilityForBooking({
      provider,
      providerUser,
      address: trimmedAddress,
    });
    if (providerAvailabilityError) {
      return res.status(409).json({
        success: false,
        message: providerAvailabilityError,
      });
    }

    const conflictingBooking = await findConflictingBooking({
      providerId,
      bookingDate: actualDate,
      timeSlot: actualTimeSlot,
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "Provider is busy for the selected date and time. Please choose another slot.",
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
      address: trimmedAddress,
      notes: trimmedNotes,
      requirements: trimmedRequirements,
      price: actualAmount,
      status: BOOKING_STATUS.PENDING_PAYMENT,
      paymentStatus: "pending",
      paymentMethod: normalizedPaymentMethod,
    });

    const hydratedBooking = await hydrateBooking(booking._id);

    return res.status(201).json({
      success: true,
      message: "Booking intent created. Complete payment to notify the provider.",
      data: {
        booking: hydratedBooking,
      },
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
    const normalizedUserRole = String(req.user.role || "").toLowerCase();

    let filter = {};

    if (normalizedUserRole === "provider") {
      const providerProfile = await Provider.findOne({ userId: req.user._id });
      filter = providerProfile
        ? {
            providerId: providerProfile._id,
            status: { $ne: BOOKING_STATUS.PENDING_PAYMENT },
          }
        : { providerId: null };
    } else if (normalizedUserRole === "admin") {
      filter = {};
    } else {
      const clientProfile = await Client.findOne({ userId: req.user._id });
      filter = clientProfile ? { clientId: clientProfile._id } : { clientId: null };
    }

    if (req.query.status) {
      filter.status = toBookingPersistenceStatus(req.query.status);
    }

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate(BOOKING_POPULATION)
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

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await hydrateBooking(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const actorRole = String(req.user?.role || "").trim().toLowerCase();

    if (actorRole === "client") {
      const clientProfile = await Client.findOne({ userId: req.user._id }).select(
        "_id"
      );
      if (
        !clientProfile ||
        String(booking.clientId?._id || booking.clientId) !==
          String(clientProfile._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own bookings.",
        });
      }
    } else if (actorRole === "provider") {
      const providerProfile = await Provider.findOne({ userId: req.user._id }).select(
        "_id"
      );
      if (
        !providerProfile ||
        String(booking.providerId?._id || booking.providerId) !==
          String(providerProfile._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own booking requests.",
        });
      }

      if (
        normalizeBookingStatus(booking.status) === BOOKING_STATUS.PENDING_PAYMENT
      ) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }
    } else if (actorRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this booking.",
      });
    }

    res.json({
      success: true,
      data: {
        booking,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const confirmBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedPaymentMethod = normalizePaymentMethod(req.body?.paymentMethod);

    const booking = await Booking.findById(id).populate("clientId", "name userId");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const clientProfile = await Client.findOne({ userId: req.user._id }).select(
      "_id name"
    );
    if (
      !clientProfile ||
      String(booking.clientId?._id || booking.clientId) !== String(clientProfile._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only complete payment for your own bookings.",
      });
    }

    if (
      normalizeBookingStatus(booking.status) !== BOOKING_STATUS.PENDING_PAYMENT
    ) {
      return res.status(409).json({
        success: false,
        message: "This booking is no longer waiting for payment.",
      });
    }

    const provider = await Provider.findById(booking.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    const providerUser = await User.findById(provider.userId).select(
      "role status approvalStatus isActive"
    );
    const providerAvailabilityError = await ensureProviderAvailabilityForBooking({
      provider,
      providerUser,
      address: booking.address,
    });
    if (providerAvailabilityError) {
      return res.status(409).json({
        success: false,
        message: providerAvailabilityError,
      });
    }

    const conflictingBooking = await findConflictingBooking({
      providerId: booking.providerId,
      bookingDate: booking.bookingDate,
      timeSlot: booking.timeSlot,
      excludeBookingId: booking._id,
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "Provider is busy for the selected date and time. Please choose another slot.",
      });
    }

    const existingTransaction = await Transaction.findOne({ bookingId: booking._id });
    if (existingTransaction) {
      return res.status(409).json({
        success: false,
        message: "Payment has already been recorded for this booking.",
      });
    }

    const service = await Service.findById(booking.serviceId).select(
      "title category price duration locationType"
    );

    booking.status = BOOKING_STATUS.PENDING;
    booking.paymentMethod = requestedPaymentMethod;
    booking.paymentStatus = requestedPaymentMethod === "upi" ? "paid" : "pending";
    await booking.save();

    await findOrCreateConversation([req.user._id, provider.userId]);

    const { transaction, payout } = await createTransactionAndMaybePayout({
      booking,
      client: clientProfile,
      provider,
      paymentMethod: requestedPaymentMethod,
    });

    await createProviderBookingNotification({
      booking,
      client: {
        _id: clientProfile._id,
        name: clientProfile.name || booking.clientId?.name || "Client",
      },
      provider,
      service: service || {},
    });

    await createClientPaymentNotification({
      userId: req.user._id,
      booking,
      service: service || {},
      paymentMethod: requestedPaymentMethod,
    });

    const hydratedBooking = await hydrateBooking(booking._id);
    const clientUserId = req.user._id;
    const providerUserId = provider.userId;

    emitBookingAndPaymentEvents({
      booking: hydratedBooking,
      clientUserId,
      providerUserId,
      transaction,
    });

    return res.json({
      success: true,
      message:
        requestedPaymentMethod === "cod"
          ? "Cash on delivery selected. Booking sent to the provider."
          : "Payment confirmed and booking request sent to the provider.",
      data: {
        booking: hydratedBooking,
        transaction,
        payout,
      },
    });
  } catch (error) {
    console.error("confirmBookingPayment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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

    const booking = await Booking.findById(id).populate("clientId", "userId name");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const actorRole = String(req.user?.role || "").trim().toLowerCase();
    const currentStatus = normalizeBookingStatus(booking.status);
    const providerProfile = await Provider.findOne({ userId: req.user._id }).select(
      "_id"
    );
    const clientProfile = await Client.findOne({ userId: req.user._id }).select(
      "_id"
    );

    if (actorRole === "provider") {
      if (!providerProfile || String(booking.providerId) !== String(providerProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own booking requests.",
        });
      }

      if (currentStatus === BOOKING_STATUS.PENDING_PAYMENT) {
        return res.status(403).json({
          success: false,
          message: "This booking is still waiting for client payment.",
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
      if (
        !clientProfile ||
        String(booking.clientId?._id || booking.clientId) !== String(clientProfile._id)
      ) {
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

      if (
        ![
          BOOKING_STATUS.PENDING_PAYMENT,
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.ACCEPTED,
        ].includes(currentStatus)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Only pending-payment, pending, or accepted bookings can be cancelled.",
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
    await booking.populate(BOOKING_POPULATION);

    const normalizedNextStatus = normalizeBookingStatus(booking.status);
    const providerUserId =
      booking.providerId?.userId?._id || booking.providerId?.userId;
    const clientUserId = booking.clientId?.userId?._id || booking.clientId?.userId;
    const recipientUserId =
      actorRole === "provider" ? clientUserId : providerUserId;

    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        title:
          actorRole === "provider"
            ? "Booking request updated"
            : "Booking cancelled",
        message:
          actorRole === "provider"
            ? `Your booking is now ${normalizedNextStatus}.`
            : `A booking is now ${normalizedNextStatus}.`,
        type: "booking",
        actionUrl:
          actorRole === "provider"
            ? "/client/bookings"
            : "/provider/booking-management",
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
        message: `Booking status updated to ${normalizedNextStatus}.`,
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

const createBookingDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!reason || !description) {
      return res.status(400).json({
        success: false,
        message: "Reason and details are required to file a dispute.",
      });
    }

    const booking = await Booking.findById(id)
      .populate("providerId", "userId name")
      .populate("clientId", "userId name");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const client = await Client.findOne({ userId: req.user._id });
    if (
      !client ||
      String(booking.clientId?._id || booking.clientId) !== String(client._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only dispute your own bookings.",
      });
    }

    const existingOpenDispute = await Dispute.findOne({
      bookingId: booking._id,
      clientId: client._id,
      status: { $in: ["open", "under_review"] },
    });

    if (existingOpenDispute) {
      return res.status(409).json({
        success: false,
        message: "An active dispute already exists for this booking.",
      });
    }

    const dispute = await Dispute.create({
      bookingId: booking._id,
      clientId: booking.clientId?._id || booking.clientId,
      providerId: booking.providerId?._id || booking.providerId,
      reason,
      description,
    });

    if (booking.providerId?.userId) {
      await createNotification({
        userId: booking.providerId.userId,
        title: "New booking dispute filed",
        message: `${booking.clientId?.name || "A client"} filed a dispute for booking #${String(
          booking._id
        ).slice(-6)}.`,
        type: "general",
        actionUrl: "/provider/disputes",
        metadata: {
          disputeId: dispute._id.toString(),
          bookingId: booking._id.toString(),
        },
      });
    }

    emitSocketEvent({
      userIds: [booking.providerId?.userId, booking.clientId?.userId],
      eventName: SOCKET_EVENTS.DISPUTE_CREATED,
      payload: {
        disputeId: dispute._id,
        bookingId: booking._id,
        status: String(dispute.status || "open").toLowerCase(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Dispute filed successfully.",
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
  getBookingById,
  confirmBookingPayment,
  updateBookingStatus,
  createBookingReview,
  createBookingDispute,
};
