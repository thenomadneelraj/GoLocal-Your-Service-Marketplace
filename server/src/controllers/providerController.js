const Provider = require("../models/Provider");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Review = require("../models/Review");

const normalizeArea = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const doesAreaMatch = (provider, client) => {
  const providerAreas = [provider?.address, provider?.location]
    .map(normalizeArea)
    .filter(Boolean);
  const clientAreas = [client?.address]
    .map(normalizeArea)
    .filter(Boolean);

  if (!providerAreas.length || !clientAreas.length) {
    return true;
  }

  return providerAreas.some((providerArea) =>
    clientAreas.some(
      (clientArea) =>
        providerArea === clientArea ||
        providerArea.includes(clientArea) ||
        clientArea.includes(providerArea)
    )
  );
};

const mapReviewForResponse = (review) => ({
  id: review?._id,
  bookingId: review?.bookingId?._id || review?.bookingId || "",
  rating: Number(review?.rating || 0),
  comment: review?.comment || "",
  createdAt: review?.createdAt,
  updatedAt: review?.updatedAt,
  serviceTitle: review?.serviceId?.title || "",
  bookingDate: review?.bookingId?.bookingDate || null,
  timeSlot: review?.bookingId?.timeSlot || "",
  clientName: review?.clientId?.name || "Client",
  clientProfileImage: review?.clientId?.profileImage || "",
});

const getProviderReviews = async (providerId, limit = 12) => {
  const query = Review.find({ providerId })
    .populate("clientId", "name profileImage")
    .populate("serviceId", "title")
    .populate("bookingId", "bookingDate timeSlot status")
    .sort({ createdAt: -1 });

  if (limit > 0) {
    query.limit(limit);
  }

  const reviews = await query;
  return reviews.map(mapReviewForResponse);
};

const buildAvailabilitySummary = async (provider, req) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const activeBookingsToday = await Booking.countDocuments({
    providerId: provider._id,
    status: { $in: ["pending", "confirmed"] },
    bookingDate: { $gte: startOfDay, $lt: endOfDay },
  });

  let clientProfile = null;
  let matchesClientAddress = true;

  if (req.user?.role && req.user.role.toLowerCase() === "client") {
    clientProfile = await Client.findOne({ userId: req.user._id });
    matchesClientAddress = doesAreaMatch(provider, clientProfile);
  }

  let status = "available";
  let reason = "Provider is available for booking.";

  if (provider.userId?.isActive === false) {
    status = "unavailable";
    reason = "Provider account is currently disabled by admin.";
  } else if (!provider.isApproved) {
    status = "unavailable";
    reason = "Provider is not approved by admin yet.";
  } else if (!provider.availability) {
    status = "unavailable";
    reason = "Provider is currently marked unavailable.";
  } else if (!matchesClientAddress) {
    status = "unavailable";
    reason = "Provider does not currently serve your saved address.";
  } else if (activeBookingsToday > 0) {
    status = "busy";
    reason = "Provider already has bookings scheduled today.";
  }

  return {
    status,
    reason,
    canBook: status !== "unavailable",
    activeBookingsToday,
    matchesClientAddress,
    providerCoverage: provider.address || provider.location || "",
    clientAddress: clientProfile?.address || "",
  };
};

// Create provider profile (Admin or similar manually doing this)
const createProvider = async (req, res) => {
  try {
    const { userId, name, phone, serviceType, bio, hourlyRate, experience, location, address, profileImage } = req.body;

    const provider = await Provider.create({
      userId,
      name,
      phone,
      profileImage: profileImage || "",
      serviceType,
      bio,
      hourlyRate,
      experience: experience || 0,
      location,
      address: address || "",
      availability: true,
    });

    res.status(201).json({
      success: true,
      data: provider
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProviders = async (req, res) => {
  try {
    const { search, serviceType, location } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    let query = { isApproved: true };
    const activeProviderUserIds = await User.find({
      role: "provider",
      isActive: true,
    }).distinct("_id");

    query.userId = { $in: activeProviderUserIds };

    if (search) {
      query.$or = [
        { bio: { $regex: search, $options: "i" } },
        { serviceType: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } }
      ];
    }
    
    if (serviceType && serviceType !== "All") {
      query.serviceType = { $regex: new RegExp(`^${serviceType}$`, "i") };
    }
    
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    const [providers, total] = await Promise.all([
      Provider.find(query)
        .populate("userId", "email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Provider.countDocuments(query),
    ]);

    const payload = providers.map((provider) => ({
      ...(provider.toObject ? provider.toObject() : provider),
      profilePhoto: provider.profileImage || provider.profilePhoto || "",
      available: provider.availability,
      reviewCount: provider.totalReviews,
    }));

    res.json({
      success: true,
      data: payload,
      providers: payload,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate("userId", "email role isActive");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";
    const isOwner =
      req.user?._id &&
      String(provider.userId?._id || provider.userId) === String(req.user._id);

    if ((!provider.isApproved || provider.userId?.isActive === false) && !isAdmin && !isOwner) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const [services, availabilitySummary, reviews] = await Promise.all([
      Service.find({ providerId: provider._id }).sort({ createdAt: -1 }),
      buildAvailabilitySummary(provider, req),
      getProviderReviews(provider._id),
    ]);

    const payload = {
      ...(provider.toObject ? provider.toObject() : provider),
      services,
      reviews,
      profilePhoto: provider.profileImage || provider.profilePhoto || "",
      available: provider.availability,
      verified: provider.isApproved,
      reviewCount: provider.totalReviews,
      yearsExperience: provider.experience,
      email: provider.userId?.email,
      availabilitySummary,
    };

    res.json({
      success: true,
      data: payload
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    // Only owner or admin can update
    const isAdmin = req.user.role === "admin" || req.user.role === "ADMIN";
    
    if (provider.userId.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const updatedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedProvider
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteProvider = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const isAdmin = req.user.role === "admin" || req.user.role === "ADMIN";

    if (provider.userId.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await Provider.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: "Provider deleted"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProviderMe = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id }).populate("userId", "email role");
    if (!provider) {
      return res.json({ success: true, data: null, message: "No provider profile found." });
    }

    const reviews = await getProviderReviews(provider._id, 25);
    res.json({
      success: true,
      data: {
        ...(provider.toObject ? provider.toObject() : provider),
        reviews,
        profilePhoto: provider.profileImage || provider.profilePhoto || "",
        available: provider.availability,
        reviewCount: provider.totalReviews,
        yearsExperience: provider.experience,
        email: provider.userId?.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProviderMe = async (req, res) => {
  try {
    let provider = await Provider.findOne({ userId: req.user._id });
    
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider profile not found." });
    }
    
    const { name, phone, serviceType, bio, hourlyRate, location, address, availability, experience, profileImage, profilePhoto } = req.body;
      
    if (name !== undefined) provider.name = name;
    if (phone !== undefined) provider.phone = phone;
    if (profileImage !== undefined || profilePhoto !== undefined) {
      provider.profileImage = profileImage ?? profilePhoto ?? "";
    }
    if (serviceType !== undefined) provider.serviceType = serviceType;
    if (bio !== undefined) provider.bio = bio;
    if (hourlyRate !== undefined) provider.hourlyRate = hourlyRate;
    if (location !== undefined) provider.location = location;
    if (address !== undefined) provider.address = address;
    if (availability !== undefined) provider.availability = availability;
    if (experience !== undefined) provider.experience = experience;

    await provider.save();

    res.json({
      success: true,
      data: {
        ...(provider.toObject ? provider.toObject() : provider),
        profilePhoto: provider.profileImage || provider.profilePhoto || "",
        available: provider.availability,
        reviewCount: provider.totalReviews,
        yearsExperience: provider.experience,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  deleteProvider,
  updateProviderMe,
  getProviderMe
};
