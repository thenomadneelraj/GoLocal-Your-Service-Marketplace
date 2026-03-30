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

    const providerUser = await User.findById(provider.userId).select("isActive");
    if (providerUser && providerUser.isActive === false) {
      return res.status(409).json({
        success: false,
        message: "Provider account is currently disabled.",
      });
    }

    if (!provider.isApproved) {
      return res.status(409).json({
        success: false,
        message: "Provider is not approved for bookings yet.",
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
      status: { $in: ["pending", "confirmed"] },
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
      status: "confirmed",
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

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
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
      filter.status = req.query.status.toLowerCase();
    }

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate("providerId", "name phone profileImage serviceType location hourlyRate userId")
        .populate("clientId", "name phone profileImage")
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

const socketIO = require("../socket");

// CHANGE booking status (simplified)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: status ? status.toLowerCase() : undefined },
      { new: true }
    ).populate("clientId", "userId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Emit real-time notification to the client
    if (booking.clientId && booking.clientId.userId) {
      const io = socketIO.getIO();
      io.to(booking.clientId.userId.toString()).emit("bookingStatusUpdate", {
        bookingId: booking._id,
        status: booking.status,
        message: `Your booking status has been updated to ${booking.status}`
      });
    }

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

    if (String(booking.status || "").toLowerCase() !== "completed") {
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
