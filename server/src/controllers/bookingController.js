const Booking = require("../models/Booking");
const Dispute = require("../models/Dispute");
const Service = require("../models/Service");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { getPlatformSettings } = require("../services/platformSettingsService");
const {
  APPROVAL_STATUS,
  isAccountActive,
  canAcceptBookings,
  canBook,
  getAccountStatusMessage,
  isProviderApproved,
  isUserApproved,
} = require("../utils/accountState");
const {
  buildAccountRestrictionResponse,
} = require("../middleware/accountAccess");
const {
  BOOKING_STATUS,
  normalizeBookingStatus,
  toBookingPersistenceStatus,
  isCompletedBooking,
} = require("../utils/bookingStatus");
const {
  normalizeTransactionStatus,
  TRANSACTION_STATUS,
} = require("../utils/transactionStatus");
const { SOCKET_EVENTS, emitSocketEvent } = require("../utils/socketEvents");
const {
  calculateTransactionBreakdown,
  buildPaymentSnapshot,
} = require("../utils/payment");

const BOOKING_PLATFORM_FEE_PERCENT = 5;
const BOOKING_DRAFT_EXPIRY_MINUTES = 30;

const BOOKING_POPULATION = [
  {
    path: "providerId",
    select:
      "name phone upiId bankName accountNumber accountHolderName profileImage serviceType location hourlyRate bio experience rating totalReviews availability address email role status approvalStatus isActive workCategories",
  },
  {
    path: "clientId",
    select:
      "name phone upiId bankName accountNumber accountHolderName profileImage address email role status approvalStatus isActive",
  },
  {
    path: "serviceId",
    select: "title category price duration locationType",
  },
];

const BOOKING_STATUS_TRANSITIONS = {
  [BOOKING_STATUS.PENDING_PAYMENT]: [
    BOOKING_STATUS.PENDING,
    BOOKING_STATUS.CANCELLED,
  ],
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
];

const normalizeArea = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizePaymentMethod = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["cash", "cash_on_delivery"].includes(normalized)) {
    return "cod";
  }
  return ["upi", "cod"].includes(normalized) ? normalized : "upi";
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

const calculateBookingTotals = (services = []) => {
  const subtotal = (Array.isArray(services) ? services : []).reduce(
    (sum, service) => sum + Number(service?.price || 0),
    0,
  );
  const platformFee = Number(
    (subtotal * (BOOKING_PLATFORM_FEE_PERCENT / 100)).toFixed(2),
  );

  return {
    subtotal,
    platformFee,
    totalAmount: Number((subtotal + platformFee).toFixed(2)),
  };
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
        targetArea.includes(providerArea),
    ),
  );
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

const ensureProviderAvailabilityForBooking = async ({ provider, address }) => {
  if (!isAccountActive(provider)) {
    return "Provider account is currently disabled.";
  }

  if (!isProviderApproved({ user: provider, provider })) {
    return provider?.approvalStatus === APPROVAL_STATUS.REJECTED
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

const resolveBookingServices = async ({ serviceIds = [], provider }) => {
  const normalizedServiceIds = Array.from(
    new Set(
      (Array.isArray(serviceIds) ? serviceIds : [serviceIds])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (!normalizedServiceIds.length) {
    return [];
  }

  const services = await Service.find({
    _id: { $in: normalizedServiceIds },
    providerId: provider._id,
    status: "active",
  }).sort({ createdAt: 1 });

  if (services.length !== normalizedServiceIds.length) {
    throw new Error("One or more selected works are unavailable.");
  }

  return services;
};

const serializeReview = (booking) => ({
  id: `${String(booking?._id || "")}:review`,
  bookingId: booking?._id,
  rating: Number(booking?.review?.rating || 0),
  comment: booking?.review?.comment || "",
  createdAt: booking?.review?.createdAt || null,
  updatedAt: booking?.review?.updatedAt || null,
  serviceTitle: booking?.serviceId?.title || "",
  clientName: booking?.clientId?.name || "Client",
  clientProfileImage: booking?.clientId?.profileImage || "",
});

const recalculateProviderRating = async (providerId) => {
  if (!providerId) return;

  const bookings = await Booking.find({
    providerId,
    "review.rating": { $exists: true },
  }).select("review");

  const ratings = bookings
    .map((booking) => Number(booking.review?.rating || 0))
    .filter((rating) => rating > 0);

  const nextRating = ratings.length
    ? Number(
        (
          ratings.reduce((sum, value) => sum + value, 0) / ratings.length
        ).toFixed(1),
      )
    : 0;

  await User.findOneAndUpdate(
    { _id: providerId, role: "provider" },
    {
      rating: nextRating,
      totalReviews: ratings.length,
    },
  );
};

const buildBookingSummaryPayload = (booking) => ({
  id: booking._id,
  bookingDate: booking.bookingDate,
  timeSlot: booking.timeSlot,
  price: booking.price,
  subtotal: Number(booking.subtotal || booking.price || 0),
  platformFee: Number(booking.platformFee || 0),
  totalAmount: Number(
    booking.totalAmount || booking.subtotal || booking.price || 0,
  ),
  status: normalizeBookingStatus(booking.status),
  paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
  paymentMethod: booking.paymentMethod || "upi",
  selectedServices: booking.selectedServices || [],
  services: booking.services || [],
});

const createProviderBookingNotification = async ({
  booking,
  client,
  provider,
  serviceLabel,
}) => {
  if (!provider?._id) {
    return;
  }

  await createNotification({
    userId: provider._id,
    title: `New booking request from ${client.name}`,
    message: `${client.name} requested ${
      serviceLabel || provider.serviceType || "a service"
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
  serviceLabel,
  paymentMethod,
}) => {
  await createNotification({
    userId,
    title: "Payment recorded",
    message:
      paymentMethod === "cod"
        ? `Cash on delivery selected for ${serviceLabel || "your booking"}.`
        : `Payment confirmed for ${serviceLabel || "your booking"}.`,
    type: "payment",
    actionUrl: "/client/payments",
    metadata: {
      bookingId: booking._id.toString(),
      paymentMethod,
      paymentStatus: String(booking.paymentStatus || "pending").toLowerCase(),
    },
  });
};

const createTransactionRecord = async ({
  booking,
  client,
  provider,
  paymentMethod,
  services = [],
  settings = {},
  currency = "INR",
}) => {
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  const transactionStatus =
    normalizedMethod === "cod"
      ? TRANSACTION_STATUS.PENDING
      : TRANSACTION_STATUS.PAID;
  const baseAmount = Number(booking.subtotal || booking.price || 0);
  const clientPlatformFee = Number(booking.platformFee || 0);
  const totalPaidByClient = Number(
    booking.totalAmount || baseAmount + clientPlatformFee,
  );
  const breakdown = calculateTransactionBreakdown({
    baseAmount,
    commissionPercentage: BOOKING_PLATFORM_FEE_PERCENT,
  });

  return Transaction.create({
    bookingId: booking._id,
    clientId: client._id,
    providerId: provider._id,
    amount: totalPaidByClient,
    baseAmount,
    clientPlatformFee,
    clientFee: clientPlatformFee,
    providerPlatformFee: breakdown.providerPlatformFee,
    providerFee: breakdown.providerPlatformFee,
    totalPaidByClient,
    totalPaid: totalPaidByClient,
    netToProvider: breakdown.netToProvider,
    providerEarn: breakdown.netToProvider,
    platformRevenue: breakdown.platformRevenue,
    commissionPercentage: BOOKING_PLATFORM_FEE_PERCENT,
    currency,
    status: transactionStatus,
    paymentMethod: normalizedMethod,
    transactionId: `${normalizedMethod.toUpperCase()}-${String(booking._id)
      .slice(-8)
      .toUpperCase()}`,
    clientPaymentSnapshot: buildPaymentSnapshot(client),
    providerPaymentSnapshot: buildPaymentSnapshot(provider),
    serviceSnapshot: {
      serviceId: booking.serviceId,
      title: services[0]?.title || "",
      category: services[0]?.category || "",
      duration: services[0]?.duration || "",
      locationType: services[0]?.locationType || "",
      services: services.map((service) => ({
        serviceId: service._id,
        title: service.title,
        category: service.category,
        price: Number(service.price || 0),
        duration: service.duration || "",
        locationType: service.locationType || "offline",
      })),
    },
  });
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

  if (!transaction) {
    return;
  }

  emitSocketEvent({
    userIds: [clientUserId, providerUserId],
    eventName: SOCKET_EVENTS.TRANSACTION_CREATED,
    payload: {
      transactionId: transaction._id,
      bookingId: booking._id,
      amount: Number(transaction.totalPaidByClient || transaction.amount || 0),
      status: normalizeTransactionStatus(transaction.status),
      paymentMethod: transaction.paymentMethod || "upi",
    },
  });

  if (
    normalizeTransactionStatus(transaction.status) === TRANSACTION_STATUS.PAID
  ) {
    emitSocketEvent({
      userIds: [clientUserId, providerUserId],
      eventName: SOCKET_EVENTS.PAYMENT_COMPLETED,
      payload: {
        transactionId: transaction._id,
        bookingId: booking._id,
        amount: Number(
          transaction.totalPaidByClient || transaction.amount || 0,
        ),
        status: normalizeTransactionStatus(transaction.status),
        paymentMethod: transaction.paymentMethod || "upi",
      },
    });
  }
};

const notifyAdminsOfDispute = async (dispute, booking) => {
  const admins = await User.find({ role: "admin" }).select("_id");

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        title: "New dispute filed",
        message: `A dispute was opened for booking #${String(booking._id).slice(
          -6,
        )}.`,
        type: "dispute",
        actionUrl: "/admin/disputes",
        metadata: {
          disputeId: dispute._id.toString(),
          bookingId: booking._id.toString(),
          threadKey: dispute.threadKey,
        },
      }),
    ),
  );
};

const buildPendingApprovalResponse = ({
  message,
  approvalStatus = APPROVAL_STATUS.PENDING,
  role = "",
}) => ({
  success: false,
  code: "ACCOUNT_APPROVAL_PENDING",
  message,
  data: {
    role: String(role || "").toUpperCase(),
    approvalStatus,
    pendingApproval: true,
  },
});

const createBooking = async (req, res) => {
  try {
    if (req.accountAccess?.restricted) {
      return res
        .status(403)
        .json(buildAccountRestrictionResponse(req.accountAccess));
    }

    const userId = req.user._id;
    const {
      providerId,
      serviceId,
      serviceIds,
      scheduledAt,
      bookingDate,
      timeSlot,
      address,
      notes,
      requirements,
    } = req.body;

    const actualDate = scheduledAt
      ? new Date(scheduledAt)
      : bookingDate
        ? new Date(bookingDate)
        : new Date();
    const actualTimeSlot = String(timeSlot || "Flexible").trim();
    const trimmedAddress = String(address || "").trim();
    const trimmedNotes = String(notes || "").trim();
    const trimmedRequirements = String(
      requirements || trimmedNotes || "General service request",
    ).trim();
    const selectedServiceIds = Array.from(
      new Set(
        (Array.isArray(serviceIds) ? serviceIds : [serviceId])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    if (!providerId || !trimmedAddress || !selectedServiceIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "providerId, address, and at least one selected work are required.",
      });
    }

    const client = await User.findOne({ _id: userId, role: "client" });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found for this user.",
      });
    }

    if (!canBook(client)) {
      return res.status(403).json(
        buildPendingApprovalResponse({
          role: client.role,
          approvalStatus: client.approvalStatus,
          message: getAccountStatusMessage(client),
        }),
      );
    }

    const provider = await User.findOne({ _id: providerId, role: "provider" });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    const providerAvailabilityError =
      await ensureProviderAvailabilityForBooking({
        provider,
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

    const services = await resolveBookingServices({
      serviceIds: selectedServiceIds,
      provider,
    });

    if (!services.length) {
      return res.status(404).json({
        success: false,
        message: "No active works were found for this provider.",
      });
    }

    const pricingSummary = calculateBookingTotals(services);
    const expiresAt = new Date(
      Date.now() + BOOKING_DRAFT_EXPIRY_MINUTES * 60 * 1000,
    );

    const booking = await Booking.create({
      clientId: client._id,
      providerId,
      serviceId: services[0]._id,
      selectedServices: services.map((service) => ({
        serviceId: service._id,
        title: service.title,
        category: service.category,
        price: Number(service.price || 0),
        duration: service.duration || "",
        locationType: service.locationType || "offline",
      })),
      bookingDate: actualDate,
      timeSlot: actualTimeSlot,
      address: trimmedAddress,
      notes: trimmedNotes,
      requirements: trimmedRequirements,
      services: services.map((service) => ({
        title: service.title,
        price: Number(service.price || 0),
      })),
      price: pricingSummary.subtotal,
      subtotal: pricingSummary.subtotal,
      platformFee: pricingSummary.platformFee,
      totalAmount: pricingSummary.totalAmount,
      status: BOOKING_STATUS.PENDING_PAYMENT,
      paymentStatus: "pending",
      paymentMethod: "upi",
      expiresAt,
    });

    const hydratedBooking = await hydrateBooking(booking._id);

    return res.status(201).json({
      success: true,
      message: "Booking draft created. Complete payment to send the request.",
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
    const requestedStatuses = String(req.query.status || "")
      .split(",")
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .map((value) => toBookingPersistenceStatus(value))
      .filter(Boolean);

    let filter = {};

    if (normalizedUserRole === "provider") {
      filter = {
        providerId: req.user._id,
        status: { $ne: BOOKING_STATUS.PENDING_PAYMENT },
      };
    } else if (normalizedUserRole === "admin") {
      filter = {};
    } else {
      filter = { clientId: req.user._id };
    }

    if (requestedStatuses.length) {
      filter.status =
        requestedStatuses.length === 1
          ? requestedStatuses[0]
          : { $in: requestedStatuses };
    }

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate(BOOKING_POPULATION)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const hydratedItems = items.map((item) => {
      const plain = item.toObject ? item.toObject() : item;
      return {
        ...plain,
        status: normalizeBookingStatus(plain.status),
        review: plain.review?.rating ? serializeReview(plain) : null,
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

    const actorRole = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    if (actorRole === "client") {
      if (
        String(booking.clientId?._id || booking.clientId) !==
        String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own bookings.",
        });
      }
    } else if (actorRole === "provider") {
      if (
        String(booking.providerId?._id || booking.providerId) !==
        String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own booking requests.",
        });
      }

      if (
        normalizeBookingStatus(booking.status) ===
        BOOKING_STATUS.PENDING_PAYMENT
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
        booking: {
          ...(booking.toObject ? booking.toObject() : booking),
          status: normalizeBookingStatus(booking.status),
          review: booking.review?.rating ? serializeReview(booking) : null,
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

const confirmBookingPayment = async (req, res) => {
  try {
    if (req.accountAccess?.restricted) {
      return res
        .status(403)
        .json(buildAccountRestrictionResponse(req.accountAccess));
    }

    const { id } = req.params;
    const requestedBookingId = id || req.body?.bookingId;
    const requestedPaymentMethod = normalizePaymentMethod(
      req.body?.paymentMethod,
    );

    const booking = await Booking.findById(requestedBookingId).populate(
      "clientId",
      "name",
    );
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      String(booking.clientId?._id || booking.clientId) !== String(req.user._id)
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

    if (booking.expiresAt && new Date(booking.expiresAt).getTime() < Date.now()) {
      booking.status = BOOKING_STATUS.CANCELLED;
      booking.paymentStatus = "failed";
      await booking.save();

      return res.status(409).json({
        success: false,
        message: "This booking draft expired. Please start checkout again.",
      });
    }

    const [provider, client] = await Promise.all([
      User.findOne({ _id: booking.providerId, role: "provider" }),
      User.findOne({ _id: req.user._id, role: "client" }),
    ]);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    if (!canBook(client)) {
      return res.status(403).json(
        buildPendingApprovalResponse({
          role: client.role,
          approvalStatus: client.approvalStatus,
          message: getAccountStatusMessage(client),
        }),
      );
    }

    if (requestedPaymentMethod === "upi" && !client.upiId) {
      return res.status(409).json({
        success: false,
        message:
          "Add your bank name and phone number in personal information before paying with UPI.",
      });
    }

    const providerAvailabilityError =
      await ensureProviderAvailabilityForBooking({
        provider,
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

    let existingTransaction = await Transaction.findOne({
      bookingId: booking._id,
    });

    const settings = await getPlatformSettings();
    const services = booking.selectedServices?.length
      ? booking.selectedServices.map((service) => ({
          _id: service.serviceId,
          title: service.title,
          category: service.category,
          price: service.price,
          duration: service.duration,
          locationType: service.locationType,
        }))
      : await Service.find({
          _id: { $in: [booking.serviceId].filter(Boolean) },
        }).select("title category price duration locationType");
    const serviceLabel = services.map((service) => service.title).join(", ");

    booking.status = BOOKING_STATUS.PENDING;
    booking.paymentMethod = requestedPaymentMethod;
    booking.paymentStatus =
      requestedPaymentMethod === "cod" ? "pending" : "paid";
    booking.expiresAt = null;
    await booking.save();

    if (!existingTransaction) {
      existingTransaction = await createTransactionRecord({
        booking,
        client,
        provider,
        paymentMethod: requestedPaymentMethod,
        services,
        settings,
        currency: settings?.currency || "INR",
      });
    } else {
      existingTransaction.paymentMethod = requestedPaymentMethod;
      existingTransaction.status =
        requestedPaymentMethod === "cod"
          ? TRANSACTION_STATUS.PENDING
          : TRANSACTION_STATUS.PAID;
      existingTransaction.baseAmount = Number(
        booking.subtotal || booking.price || 0,
      );
      existingTransaction.clientPlatformFee = Number(booking.platformFee || 0);
      existingTransaction.clientFee = existingTransaction.clientPlatformFee;
      existingTransaction.totalPaidByClient = Number(
        booking.totalAmount ||
          existingTransaction.totalPaidByClient ||
          existingTransaction.amount ||
          0,
      );
      existingTransaction.totalPaid = existingTransaction.totalPaidByClient;
      existingTransaction.amount = existingTransaction.totalPaidByClient;
      await existingTransaction.save();
    }

    await createProviderBookingNotification({
      booking,
      client,
      provider,
      serviceLabel,
    });

    await createClientPaymentNotification({
      userId: req.user._id,
      booking,
      serviceLabel,
      paymentMethod: requestedPaymentMethod,
    });

    const hydratedBooking = await hydrateBooking(booking._id);

    emitBookingAndPaymentEvents({
      booking: hydratedBooking,
      clientUserId: req.user._id,
      providerUserId: provider._id,
      transaction: existingTransaction,
    });

    return res.json({
      success: true,
      message:
        requestedPaymentMethod === "cod"
          ? "Cash on delivery selected. Booking sent to the provider."
          : "Payment confirmed and booking request sent to the provider.",
      data: {
        booking: hydratedBooking,
        transaction: existingTransaction,
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

const confirmBookingCheckout = (req, res) => confirmBookingPayment(req, res);

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

    const booking = await Booking.findById(id).populate("clientId", "name");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const actorRole = String(req.user?.role || "")
      .trim()
      .toLowerCase();
    const currentStatus = normalizeBookingStatus(booking.status);

    if (req.accountAccess?.restricted && actorRole !== "admin") {
      return res
        .status(403)
        .json(buildAccountRestrictionResponse(req.accountAccess));
    }

    if (actorRole === "provider") {
      if (!canAcceptBookings(req.user)) {
        return res.status(403).json(
          buildPendingApprovalResponse({
            role: req.user?.role,
            approvalStatus: req.accountAccess?.approvalStatus,
            message: getAccountStatusMessage(req.user),
          }),
        );
      }

      if (String(booking.providerId) !== String(req.user._id)) {
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
        String(booking.clientId?._id || booking.clientId) !==
        String(req.user._id)
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

    if (
      nextStatus === BOOKING_STATUS.COMPLETED &&
      String(booking.paymentMethod || "").toLowerCase() === "cod"
    ) {
      booking.paymentStatus = "paid";
      await Transaction.findOneAndUpdate(
        { bookingId: booking._id },
        { status: TRANSACTION_STATUS.PAID },
      );
    }

    await booking.save();
    await booking.populate(BOOKING_POPULATION);

    const normalizedNextStatus = normalizeBookingStatus(booking.status);
    const providerUserId = booking.providerId?._id;
    const clientUserId = booking.clientId?._id;
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
      data: {
        ...(booking.toObject ? booking.toObject() : booking),
        status: normalizeBookingStatus(booking.status),
        review: booking.review?.rating ? serializeReview(booking) : null,
      },
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
    if (req.accountAccess?.restricted) {
      return res
        .status(403)
        .json(buildAccountRestrictionResponse(req.accountAccess));
    }

    const { id } = req.params;
    const { rating, comment } = req.body;
    const numericRating = Number(rating);
    const trimmedComment = String(comment || "").trim();

    if (
      !Number.isFinite(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    const booking = await Booking.findById(id)
      .populate("clientId", "name profileImage")
      .populate("serviceId", "title");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      String(booking.clientId?._id || booking.clientId) !== String(req.user._id)
    ) {
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

    const existingCreatedAt = booking.review?.createdAt || null;
    const now = new Date();
    booking.review = {
      rating: numericRating,
      comment: trimmedComment,
      createdAt: existingCreatedAt || now,
      updatedAt: now,
    };
    await booking.save();

    await recalculateProviderRating(booking.providerId);

    res.status(201).json({
      success: true,
      message: existingCreatedAt
        ? "Review updated successfully."
        : "Review submitted successfully.",
      data: serializeReview(booking),
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
    if (req.accountAccess?.restricted) {
      return res
        .status(403)
        .json(buildAccountRestrictionResponse(req.accountAccess));
    }

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
      .populate("providerId", "name")
      .populate("clientId", "name");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (
      String(booking.clientId?._id || booking.clientId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only dispute your own bookings.",
      });
    }

    const existingOpenDispute = await Dispute.findOne({
      bookingId: booking._id,
      reporterId: req.user._id,
      status: { $in: ["open", "under_review", "escalated"] },
    });

    if (existingOpenDispute) {
      return res.status(409).json({
        success: false,
        message: "An active dispute already exists for this booking.",
      });
    }

    const dispute = await Dispute.create({
      bookingId: booking._id,
      reporterId: req.user._id,
      clientId: booking.clientId?._id || booking.clientId,
      providerId: booking.providerId?._id || booking.providerId,
      targetUserId: booking.providerId?._id || booking.providerId,
      targetType: "provider",
      threadKey: `provider:${String(booking.providerId?._id || booking.providerId)}:client:${String(
        booking.clientId?._id || booking.clientId,
      )}`,
      subject: `Booking #${String(booking._id).slice(-6)} dispute`,
      reason,
      description,
    });

    if (booking.providerId?._id) {
      await createNotification({
        userId: booking.providerId._id,
        title: "New booking dispute filed",
        message: `${booking.clientId?.name || "A client"} filed a dispute for booking #${String(
          booking._id,
        ).slice(-6)}.`,
        type: "dispute",
        actionUrl: "/provider/disputes",
        metadata: {
          disputeId: dispute._id.toString(),
          bookingId: booking._id.toString(),
          threadKey: dispute.threadKey,
        },
      });
    }

    await notifyAdminsOfDispute(dispute, booking);

    emitSocketEvent({
      userIds: [booking.providerId?._id, booking.clientId?._id],
      eventName: SOCKET_EVENTS.DISPUTE_CREATED,
      payload: {
        disputeId: dispute._id,
        bookingId: booking._id,
        status: String(dispute.status || "open").toLowerCase(),
        threadKey: dispute.threadKey,
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
  createBookingDraft: createBooking,
  getMyBookings,
  getBookingById,
  confirmBookingPayment,
  confirmBookingCheckout,
  updateBookingStatus,
  createBookingReview,
  createBookingDispute,
};
