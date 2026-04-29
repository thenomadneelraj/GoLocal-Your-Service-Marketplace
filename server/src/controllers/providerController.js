const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");
const {
  APPROVAL_STATUS,
  isProviderApproved,
  buildPersistedAccountState,
  isAccountActive,
} = require("../utils/accountState");
const { BOOKING_STATUS } = require("../utils/bookingStatus");

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



const buildAvailabilitySummary = async (provider, req) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const activeBookingsToday = await Booking.countDocuments({
    providerId: provider._id,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED, "confirmed"] },
    bookingDate: { $gte: startOfDay, $lt: endOfDay },
  });

  let clientProfile = null;
  let matchesClientAddress = true;

  if (req.user?.role && req.user.role.toLowerCase() === "client") {
    clientProfile = await User.findOne({ _id: req.user._id, role: 'client' });
    matchesClientAddress = doesAreaMatch(provider, clientProfile);
  }

  let status = "available";
  let reason = "Provider is available for booking.";
  const providerUserState = buildPersistedAccountState({
    role: provider.role || "provider",
    status: provider.status,
    isActive: provider.isActive,
    approvalStatus: provider.approvalStatus,
    isApproved: provider.isApproved,
  });

  if (!isAccountActive(provider)) {
    status = "unavailable";
    reason = "Provider account is currently disabled by admin.";
  } else if (!isProviderApproved({ user: provider, provider })) {
    status = "unavailable";
    reason =
      providerUserState.approvalStatus === APPROVAL_STATUS.REJECTED
        ? "Provider account was rejected by admin."
        : "Provider is not approved by admin yet.";
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

const normalizeAvailabilitySchedule = (schedule = []) => {
  if (!Array.isArray(schedule)) {
    return [];
  }

  return schedule
    .map((slot) => ({
      day: String(slot?.day || "").trim(),
      enabled: Boolean(slot?.enabled),
      startTime: String(slot?.startTime || "09:00").trim(),
      endTime: String(slot?.endTime || "18:00").trim(),
    }))
    .filter((slot) => slot.day);
};

// Create provider profile (Admin or similar manually doing this)
const createProvider = async (req, res) => {
  try {
    const {
      userId,
      name,
      phone,
      upiId,
      serviceType,
      bio,
      hourlyRate,
      experience,
      location,
      address,
      profileImage,
    } = req.body;

    const provider = await User.create({
      _id: userId,
      name,
      phone,
      role: 'provider',
      upiId: upiId || (phone ? `${phone}@golocal` : ""),
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
    const query = {};

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

    const providers = await User.find({ ...query, role: 'provider' })
      .sort({ createdAt: -1 });

    const visibleProviders = providers.filter(
      (provider) =>
        isAccountActive(provider) &&
        isProviderApproved({ user: provider, provider })
    );

    const total = visibleProviders.length;
    const paginatedProviders = visibleProviders.slice(
      (page - 1) * limit,
      (page - 1) * limit + limit
    );

    const Service = require("../models/Service");
    const payload = await Promise.all(paginatedProviders.map(async (provider) => {
      const providerObj = provider.toObject ? provider.toObject() : provider;
      
      const services = await Service.find({ 
        providerId: provider._id, 
        status: "active" 
      }).select("price").lean();
      
      const prices = services.map(s => s.price).filter(p => p && p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const startingPrice = minPrice || provider.hourlyRate || 0;
      
      return {
        ...providerObj,
        profilePhoto: provider.profileImage || provider.profilePhoto || "",
        available: provider.availability,
        verified: isProviderApproved({ user: provider, provider }),
        status:
          provider.status ||
          (provider.isActive === false ? "suspended" : "active"),
        approvalStatus:
          provider.approvalStatus ||
          (provider.isApproved ? "approved" : "pending"),
        hourlyRate: startingPrice,
        availabilitySchedule: normalizeAvailabilitySchedule(
          provider.availabilitySchedule
        ),
        servicePriceRange: prices.length > 1 ? `${Math.min(...prices)}-${Math.max(...prices)}` : (prices.length === 1 ? prices[0] : null),
        serviceCount: services.length,
      };
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
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";
    const isOwner =
      req.user?._id &&
      String(provider._id) === String(req.user._id);

    if (
      (!isProviderApproved({ user: provider, provider }) ||
        !isAccountActive(provider)) &&
      !isAdmin &&
      !isOwner
    ) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const [services, availabilitySummary, completedJobs] = await Promise.all([
      Service.find({ providerId: provider._id, status: "active" }).sort({ createdAt: -1 }),
      buildAvailabilitySummary(provider, req),
      Booking.countDocuments({ providerId: provider._id, status: "completed" }),
    ]);

    const prices = services.map(s => s.price).filter(p => p && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const startingPrice = minPrice || provider.hourlyRate || 0;

    const payload = {
      ...(provider.toObject ? provider.toObject() : provider),
      services,
      profilePhoto: provider.profileImage || provider.profilePhoto || "",
      available: provider.availability,
      verified: isProviderApproved({ user: provider, provider }),
      status:
        provider.status ||
        (provider.isActive === false ? "suspended" : "active"),
      approvalStatus:
        provider.approvalStatus ||
        (provider.isApproved ? "approved" : "pending"),
      yearsExperience: provider.experience,
      email: provider.email,
      bankName: provider.bankName || "",
      upiId: provider.upiId || "",
      workCategories: Array.isArray(provider.workCategories)
        ? provider.workCategories
        : [],
      availabilitySchedule: normalizeAvailabilitySchedule(
        provider.availabilitySchedule
      ),
      serviceAreas: Array.isArray(provider.serviceAreas)
        ? provider.serviceAreas
        : [],
      serviceRadius: Number(provider.serviceRadius || 0),
      availabilitySummary,
      completedJobs,
      hourlyRate: startingPrice,
      servicePriceRange: prices.length > 1 ? `${Math.min(...prices)}-${Math.max(...prices)}` : (prices.length === 1 ? prices[0] : null),
      serviceCount: services.length,
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
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    // Only owner or admin can update
    const isAdmin = req.user.role === "admin" || req.user.role === "ADMIN";

    if (provider._id.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const updatedProvider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'provider' },
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
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const isAdmin = req.user.role === "admin" || req.user.role === "ADMIN";

    if (provider._id.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await User.findOneAndDelete({ _id: req.params.id, role: 'provider' });

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
    const provider = await User.findOne({ _id: req.user._id, role: 'provider' });
    if (!provider) {
      return res.json({ success: true, data: null, message: "No provider profile found." });
    }

    const [completedJobs] = await Promise.all([
      Booking.countDocuments({ providerId: provider._id, status: "completed" }),
    ]);
    res.json({
      success: true,
      data: {
        ...(provider.toObject ? provider.toObject() : provider),
        profilePhoto: provider.profileImage || provider.profilePhoto || "",
        available: provider.availability,
        yearsExperience: provider.experience,
        email: provider.email,
        bankName: provider.bankName || "",
        accountNumber: provider.accountNumber || "",
        accountHolderName:
          provider.accountHolderName || provider.name || "",
        upiId: provider.upiId || "",
        workCategories: Array.isArray(provider.workCategories)
          ? provider.workCategories
          : [],
        availabilitySchedule: normalizeAvailabilitySchedule(
          provider.availabilitySchedule
        ),
        serviceAreas: Array.isArray(provider.serviceAreas)
          ? provider.serviceAreas
          : [],
        serviceRadius: Number(provider.serviceRadius || 0),
        status:
          provider.status ||
          (provider.isActive === false ? "suspended" : "active"),
        approvalStatus:
          provider.approvalStatus ||
          (provider.isApproved ? "approved" : "pending"),
        completedJobs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProviderMe = async (req, res) => {
  try {
    let provider = await User.findOne({ _id: req.user._id, role: 'provider' });
    
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider profile not found." });
    }
    
    const {
      name,
      phone,
      upiId,
      serviceType,
      bio,
      hourlyRate,
      location,
      address,
      availability,
      experience,
      profileImage,
      profilePhoto,
      bankName,
      accountNumber,
      accountHolderName,
      workCategories,
      serviceAreas,
      serviceRadius,
      availabilitySchedule,
    } = req.body;
      
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
    if (availabilitySchedule !== undefined) {
      provider.availabilitySchedule =
        normalizeAvailabilitySchedule(availabilitySchedule);
    }
    if (experience !== undefined) provider.experience = experience;
    if (bankName !== undefined) provider.bankName = String(bankName || "").trim();
    if (accountNumber !== undefined) {
      provider.accountNumber = String(accountNumber || "").trim();
    }
    if (accountHolderName !== undefined) {
      provider.accountHolderName = String(
        accountHolderName || provider.name || ""
      ).trim();
    }
    if (Array.isArray(workCategories)) {
      provider.workCategories = workCategories;
    }
    if (Array.isArray(serviceAreas)) {
      provider.serviceAreas = serviceAreas
        .map((area) => String(area || "").trim())
        .filter(Boolean);
    }
    if (serviceRadius !== undefined) {
      const radius = Number(serviceRadius);
      provider.serviceRadius = Number.isFinite(radius) && radius >= 0 ? radius : 0;
    }

    await provider.save();

    emitSocketEvent({
      userIds: [req.user._id],
      eventName: SOCKET_EVENTS.USER_UPDATED,
      payload: {
        userId: req.user._id.toString(),
        message: "Provider profile updated successfully.",
      },
    });

    res.json({
      success: true,
      data: {
        ...(provider.toObject ? provider.toObject() : provider),
        profilePhoto: provider.profileImage || provider.profilePhoto || "",
        available: provider.availability,
        yearsExperience: provider.experience,
        bankName: provider.bankName || "",
        accountNumber: provider.accountNumber || "",
        accountHolderName:
          provider.accountHolderName || provider.name || "",
        upiId: provider.upiId || "",
        workCategories: Array.isArray(provider.workCategories)
          ? provider.workCategories
          : [],
        availabilitySchedule: normalizeAvailabilitySchedule(
          provider.availabilitySchedule
        ),
        serviceAreas: Array.isArray(provider.serviceAreas)
          ? provider.serviceAreas
          : [],
        serviceRadius: Number(provider.serviceRadius || 0),
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
