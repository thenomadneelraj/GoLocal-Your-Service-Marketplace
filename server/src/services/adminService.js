const User = require("../models/User");
const Admin = require("../models/Admin");
const Provider = require("../models/Provider");
const Client = require("../models/Client");
const { createNotification } = require("./notificationService");
const {
  USER_STATUS,
  APPROVAL_STATUS,
  buildPersistedAccountState,
  normalizeApprovalStatus,
  normalizeUserStatus,
} = require("../utils/accountState");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");

// Get dashboard statistics
const getDashboardStats = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await Provider.countDocuments();
    const verifiedProviders = await Provider.countDocuments({ isApproved: true });
    const pendingProviders = await Provider.countDocuments({ isApproved: false });

    // Get users by role
    const clients = await User.countDocuments({ role: { $in: ["CLIENT", "client"] } });
    const admins = await Admin.countDocuments();

    return {
      totalUsers,
      totalProviders,
      verifiedProviders,
      pendingProviders,
      clients,
      admins,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get all users with pagination
const getAllUsers = async (page = 1, limit = 10, role = null) => {
  try {
    // If they ask for "CLIENT", map to "client" to match new schema logic mostly, but we'll accept both
    const query = role ? { role: { $regex: new RegExp(`^${role}$`, "i") } } : {};
    let users = await User.find(query)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // To populate "name", we need to fetch corresponding Client or Provider profiles
    const enhancedUsers = await Promise.all(
      users.map(async (u) => {
        let name = "";
        let phone = "";
        if (u.role === "client") {
          const client = await Client.findOne({ userId: u._id });
          if (client) {
            name = client.name;
            phone = client.phone;
          }
        } else if (u.role === "provider") {
          const provider = await Provider.findOne({ userId: u._id });
          if (provider) {
            name = provider.name;
            phone = provider.phone;
          }
        } else {
          // If admin
          if (u.name) name = u.name;
        }

        return {
          ...u.toObject(),
          name,
          phone,
          status: normalizeUserStatus(u.status, u.isActive),
          approvalStatus: normalizeApprovalStatus(u.approvalStatus, {
            role: u.role,
            isApproved: u.role === "provider" ? undefined : true,
            status: normalizeUserStatus(u.status, u.isActive),
          }),
        };
      })
    );

    return {
      users: enhancedUsers,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get all providers with user details
const getAllProviders = async (page = 1, limit = 10) => {
  try {
    const providers = await Provider.find()
      .populate("userId", "email role status approvalStatus isActive")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Provider.countDocuments();

    return {
      providers: providers.map((provider) => {
        const user = provider.userId || {};
        const state = buildPersistedAccountState({
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          isApproved: provider.isApproved,
        });

        return {
          ...(provider.toObject ? provider.toObject() : provider),
          status: state.status,
          approvalStatus: state.approvalStatus,
          isActive: state.isActive,
          isApproved: state.approvalStatus === APPROVAL_STATUS.APPROVED,
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Update user status (enable/disable)
const updateUserStatus = async (userId, isActive) => {
  try {
    const currentUser = await User.findById(userId).select("-password");
    if (!currentUser) {
      throw new Error("User not found");
    }

    const nextStatus =
      typeof isActive === "string" && isActive.trim()
        ? normalizeUserStatus(isActive, currentUser.isActive)
        : isActive === false
          ? USER_STATUS.SUSPENDED
          : USER_STATUS.ACTIVE;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        status: nextStatus,
        isActive: nextStatus === USER_STATUS.ACTIVE,
      },
      { new: true },
    ).select("-password");

    await createNotification({
      userId,
      title: "Account status updated",
      message: `Your account status is now ${nextStatus}.`,
      type: "account",
      actionUrl: "",
      metadata: {
        status: nextStatus,
      },
    });

    emitSocketEvent({
      userIds: [userId],
      eventName: SOCKET_EVENTS.USER_STATUS_UPDATED,
      payload: {
        userId,
        status: nextStatus,
        approvalStatus: user.approvalStatus,
        message: `Your account status is now ${nextStatus}.`,
      },
    });

    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Verify/unverify provider
const updateProviderStatus = async (providerId, approvalInput) => {
  try {
    const currentProvider = await Provider.findById(providerId).populate(
      "userId",
      "email role status approvalStatus isActive"
    );

    if (!currentProvider) {
      throw new Error("Provider not found");
    }

    let nextApprovalStatus;
    if (typeof approvalInput === "string" && approvalInput.trim()) {
      nextApprovalStatus = normalizeApprovalStatus(approvalInput, {
        role: "provider",
        isApproved: currentProvider.isApproved,
        status: normalizeUserStatus(
          currentProvider.userId?.status,
          currentProvider.userId?.isActive
        ),
      });
    } else {
      nextApprovalStatus =
        approvalInput === true
          ? APPROVAL_STATUS.APPROVED
          : APPROVAL_STATUS.PENDING;
    }

    const currentUserStatus = normalizeUserStatus(
      currentProvider.userId?.status,
      currentProvider.userId?.isActive
    );
    const nextUserStatus =
      nextApprovalStatus === APPROVAL_STATUS.REJECTED
        ? USER_STATUS.REJECTED
        : nextApprovalStatus === APPROVAL_STATUS.APPROVED
          ? USER_STATUS.ACTIVE
          : currentUserStatus === USER_STATUS.SUSPENDED
            ? USER_STATUS.SUSPENDED
            : USER_STATUS.ACTIVE;

    await User.findByIdAndUpdate(currentProvider.userId?._id, {
      status: nextUserStatus,
      isActive: nextUserStatus === USER_STATUS.ACTIVE,
      approvalStatus: nextApprovalStatus,
    });

    const provider = await Provider.findByIdAndUpdate(
      providerId,
      {
        isApproved: nextApprovalStatus === APPROVAL_STATUS.APPROVED,
      },
      { new: true },
    ).populate("userId", "email role status approvalStatus isActive");

    if (!provider) {
      throw new Error("Provider not found");
    }

    const providerUserId = provider.userId?._id;
    if (providerUserId) {
      await createNotification({
        userId: providerUserId,
        title: "Provider approval updated",
        message: `Your provider approval status is now ${nextApprovalStatus}.`,
        type: "account",
        actionUrl: "/provider-dashboard",
        metadata: {
          approvalStatus: nextApprovalStatus,
          status: nextUserStatus,
        },
      });

      emitSocketEvent({
        userIds: [providerUserId],
        eventName: SOCKET_EVENTS.USER_STATUS_UPDATED,
        payload: {
          userId: providerUserId,
          status: nextUserStatus,
          approvalStatus: nextApprovalStatus,
          message: `Your provider approval status is now ${nextApprovalStatus}.`,
        },
      });
    }

    return provider;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get single user by ID
const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    return {
      ...(user.toObject ? user.toObject() : user),
      status: normalizeUserStatus(user.status, user.isActive),
      approvalStatus: normalizeApprovalStatus(user.approvalStatus, {
        role: user.role,
        status: normalizeUserStatus(user.status, user.isActive),
      }),
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get single provider by ID
const getProviderById = async (providerId) => {
  try {
    const provider = await Provider.findById(providerId).populate(
      "userId",
      "email role status approvalStatus isActive",
    );

    if (!provider) {
      throw new Error("Provider not found");
    }

    return {
      ...(provider.toObject ? provider.toObject() : provider),
      status: normalizeUserStatus(
        provider.userId?.status,
        provider.userId?.isActive
      ),
      approvalStatus: normalizeApprovalStatus(provider.userId?.approvalStatus, {
        role: provider.userId?.role,
        status: normalizeUserStatus(
          provider.userId?.status,
          provider.userId?.isActive
        ),
        isApproved: provider.isApproved,
      }),
      isApproved:
        normalizeApprovalStatus(provider.userId?.approvalStatus, {
          role: provider.userId?.role,
          status: normalizeUserStatus(
            provider.userId?.status,
            provider.userId?.isActive
          ),
          isApproved: provider.isApproved,
        }) === APPROVAL_STATUS.APPROVED,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getAllProviders,
  updateUserStatus,
  updateProviderStatus,
  getUserById,
  getProviderById,
};
