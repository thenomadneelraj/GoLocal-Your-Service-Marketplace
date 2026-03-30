const Service = require("../models/Service");
const Transaction = require("../models/Transaction");
const Payout = require("../models/Payout");
const Review = require("../models/Review");
const Dispute = require("../models/Dispute");
const PlatformSetting = require("../models/PlatformSetting");
const LoginHistory = require("../models/LoginHistory");
const ActivityLog = require("../models/ActivityLog");

// Helpers
const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const logActivity = async ({
  actor,
  action,
  targetType,
  targetId,
  metadata = {},
}) => {
  if (!actor?._id) return;
  try {
    await ActivityLog.create({
      actor: actor._id,
      actorModel: actor.role === "ADMIN" ? "Admin" : "User",
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch (error) {
    // Do not block main flow
    console.error("Failed to create activity log", error.message);
  }
};

// 1️⃣ Service Catalog

const listServices = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const isActive = req.query.isActive;

    const filter = {};
    if (isActive === "true") filter.isActive = true;
    if (isActive === "false") filter.isActive = false;

    const [items, total] = await Promise.all([
      Service.find(filter)
        .populate("assignedProvider", "displayName user")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Service.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createService = async (req, res) => {
  try {
    const { name, description, category, basePrice, assignedProvider, isActive } =
      req.body;

    const service = await Service.create({
      name,
      description,
      category,
      basePrice,
      assignedProvider: assignedProvider || null,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await logActivity({
      actor: req.user,
      action: "SERVICE_CREATED",
      targetType: "Service",
      targetId: service._id.toString(),
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body, updatedBy: req.user._id };

    const service = await Service.findByIdAndUpdate(id, payload, {
      new: true,
    });

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    await logActivity({
      actor: req.user,
      action: "SERVICE_UPDATED",
      targetType: "Service",
      targetId: id,
    });

    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Service.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    await logActivity({
      actor: req.user,
      action: "SERVICE_DELETED",
      targetType: "Service",
      targetId: id,
    });

    res.json({ success: true, message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    service.isActive = !service.isActive;
    service.updatedBy = req.user._id;
    await service.save();

    await logActivity({
      actor: req.user,
      action: "SERVICE_TOGGLED",
      targetType: "Service",
      targetId: id,
      metadata: { isActive: service.isActive },
    });

    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignProviderToService = async (req, res) => {
  try {
    const { id } = req.params;
    const { providerId } = req.body;

    const service = await Service.findByIdAndUpdate(
      id,
      { assignedProvider: providerId, updatedBy: req.user._id },
      { new: true }
    );

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    await logActivity({
      actor: req.user,
      action: "SERVICE_PROVIDER_ASSIGNED",
      targetType: "Service",
      targetId: id,
      metadata: { providerId },
    });

    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2️⃣ Transactions

const listTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, from, to } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate("clientId", "name")
        .populate({
          path: "bookingId",
          select: "status serviceId providerId",
          populate: [
            { path: "serviceId", select: "name" },
            { path: "providerId", select: "name" }
          ]
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3️⃣ Payouts

const listPayouts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Payout.find(filter)
        .populate("providerId", "name")
        .populate("bookingId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payout.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markPayoutPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const payout = await Payout.findById(id);
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: "Payout not found" });
    }

    payout.status = "paid";
    payout.payoutDate = new Date();
    await payout.save();

    await logActivity({
      actor: req.user,
      action: "PAYOUT_MARKED_PAID",
      targetType: "Payout",
      targetId: id,
    });

    res.json({ success: true, data: payout });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4️⃣ Ratings & Reviews

const listReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const [items, total] = await Promise.all([
      Review.find()
        .populate("clientId", "name")
        .populate("providerId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Review.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    await logActivity({
      actor: req.user,
      action: "REVIEW_DELETED",
      targetType: "Review",
      targetId: id,
    });

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const flagReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { flaggedReason } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      {
        isFlagged: true,
        flaggedReason: flaggedReason || "Flagged by admin",
        flaggedBy: req.user._id,
      },
      { new: true }
    );

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    await logActivity({
      actor: req.user,
      action: "REVIEW_FLAGGED",
      targetType: "Review",
      targetId: id,
      metadata: { flaggedReason },
    });

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5️⃣ Disputes

const listDisputes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Dispute.find(filter)
        .populate("clientId", "name")
        .populate("providerId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDispute = async (req, res) => {
  try {
    const { bookingId, clientId, providerId, reason, description } = req.body;

    const dispute = await Dispute.create({
      bookingId,
      clientId,
      providerId,
      reason,
      description: description || "No description provided",
    });

    await logActivity({
      actor: req.user,
      action: "DISPUTE_CREATED",
      targetType: "Dispute",
      targetId: dispute._id.toString(),
    });

    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    const dispute = await Dispute.findByIdAndUpdate(
      id,
      {
        status,
        resolutionNote,
        resolvedBy: req.user._id,
      },
      { new: true }
    );

    if (!dispute) {
      return res
        .status(404)
        .json({ success: false, message: "Dispute not found" });
    }

    await logActivity({
      actor: req.user,
      action: "DISPUTE_STATUS_UPDATED",
      targetType: "Dispute",
      targetId: id,
      metadata: { status },
    });

    res.json({ success: true, data: dispute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6️⃣ Platform Settings

const getPlatformSettings = async (req, res) => {
  try {
    let settings = await PlatformSetting.findOne();
    if (!settings) {
      settings = await PlatformSetting.create({
        commissionPercentage: 10,
        commissionRate: 10,
        platformName: "GoLocal",
        currency: "INR",
        supportEmail: "support@golocal.com",
        updatedBy: req.user._id,
      });
    }

    const payload = settings.toObject ? settings.toObject() : settings;
    if (payload.commissionPercentage === undefined || payload.commissionPercentage === null) {
      payload.commissionPercentage = payload.commissionRate ?? 10;
    }

    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    const { commissionPercentage, platformName, maintenanceMode } = req.body;
    const normalizedCommission =
      commissionPercentage !== undefined ? Number(commissionPercentage) : undefined;
    const normalizedPlatformName =
      platformName !== undefined ? String(platformName).trim() : undefined;

    const settings = await PlatformSetting.findOneAndUpdate(
      {},
      {
        ...(normalizedCommission !== undefined && {
          commissionPercentage: normalizedCommission,
          commissionRate: normalizedCommission,
        }),
        ...(normalizedPlatformName !== undefined && {
          platformName: normalizedPlatformName || "GoLocal",
        }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
        updatedBy: req.user._id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const payload = settings.toObject ? settings.toObject() : settings;
    if (payload.commissionPercentage === undefined || payload.commissionPercentage === null) {
      payload.commissionPercentage = payload.commissionRate ?? 10;
    }

    await logActivity({
      actor: req.user,
      action: "SETTINGS_UPDATED",
      targetType: "PlatformSetting",
      targetId: settings._id.toString(),
      metadata: {
        commissionPercentage: normalizedCommission,
        platformName: normalizedPlatformName,
        maintenanceMode,
      },
    });

    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7️⃣ Security (login history + activity logs)

const listLoginHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const [items, total] = await Promise.all([
      LoginHistory.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LoginHistory.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const [items, total] = await Promise.all([
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: buildPagination(page, limit, total),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // services
  listServices,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  assignProviderToService,
  // transactions
  listTransactions,
  // payouts
  listPayouts,
  markPayoutPaid,
  // reviews
  listReviews,
  deleteReview,
  flagReview,
  // disputes
  listDisputes,
  createDispute,
  updateDisputeStatus,
  // settings
  getPlatformSettings,
  updatePlatformSettings,
  // security
  listLoginHistory,
  listActivityLogs,
};

