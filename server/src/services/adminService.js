const User = require("../models/User");
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
const {
  VERIFICATION_STATUS,
  normalizeVerificationStatus,
} = require("../utils/verification");

// Get dashboard statistics
const getDashboardStats = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ role: { $in: ["provider", "PROVIDER"] } });
    const verifiedProviders = await User.countDocuments({
      role: { $in: ["provider", "PROVIDER"] },
      approvalStatus: APPROVAL_STATUS.APPROVED,
    });
    const pendingProviders = await User.countDocuments({
      role: { $in: ["provider", "PROVIDER"] },
      approvalStatus: APPROVAL_STATUS.PENDING,
    });

    // Get users by role
    const clients = await User.countDocuments({ role: { $in: ["CLIENT", "client"] } });
    const admins = await User.countDocuments({ role: { $in: ["admin", "ADMIN"] } });

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
        let name = u.name || "";
        let phone = u.phone || "";

        return {
          ...u.toObject(),
          name,
          phone,
          status: normalizeUserStatus(u.status, u.isActive),
          approvalStatus: normalizeApprovalStatus(u.approvalStatus, {
            role: u.role,
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
    const providers = await User.find({ role: { $in: ["provider", "PROVIDER"] } })
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ role: { $in: ["provider", "PROVIDER"] } });

    return {
      providers: providers.map((user) => {
        const state = buildPersistedAccountState({
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
        });

        return {
          ...user.toObject(),
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
const updateUserStatus = async (userId, nextState = {}) => {
  try {
    const currentUser = await User.findById(userId).select("-password");
    if (!currentUser) {
      throw new Error("User not found");
    }

    const requestedState =
      typeof nextState === "object" && nextState !== null
        ? nextState
        : { status: nextState };

    const nextStatus =
      typeof requestedState.status === "string" && requestedState.status.trim()
        ? normalizeUserStatus(requestedState.status, currentUser.isActive)
        : requestedState.status === false
          ? USER_STATUS.SUSPENDED
          : USER_STATUS.ACTIVE;
    const nextApprovalStatus = normalizeApprovalStatus(
      requestedState.approvalStatus ?? currentUser.approvalStatus,
      {
        role: currentUser.role,
        status: nextStatus,
      }
    );

    const user = await User.findByIdAndUpdate(
      userId,
      {
        status: nextStatus,
        isActive: nextStatus === USER_STATUS.ACTIVE,
        approvalStatus: nextApprovalStatus,
      },
      { new: true, runValidators: true },
    ).select("-password");

    const message =
      nextApprovalStatus === APPROVAL_STATUS.APPROVED &&
      currentUser.approvalStatus !== APPROVAL_STATUS.APPROVED
        ? "Your account has been approved."
        : `Your account status is now ${nextStatus}.`;

    await createNotification({
      userId,
      title: "Account status updated",
      message,
      type: "account",
      actionUrl: "",
      metadata: {
        status: nextStatus,
        approvalStatus: nextApprovalStatus,
      },
    });

    emitSocketEvent({
      userIds: [userId],
      eventName: SOCKET_EVENTS.USER_STATUS_UPDATED,
      payload: {
        userId,
        status: nextStatus,
        approvalStatus: nextApprovalStatus,
        message,
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
    const currentProvider = await User.findById(providerId).select("-password");

    if (!currentProvider) {
      throw new Error("Provider not found");
    }

    let nextApprovalStatus;
    if (typeof approvalInput === "string" && approvalInput.trim()) {
      nextApprovalStatus = normalizeApprovalStatus(approvalInput, {
        role: "provider",
        status: normalizeUserStatus(
          currentProvider.status,
          currentProvider.isActive
        ),
      });
    } else {
      nextApprovalStatus =
        approvalInput === true
          ? APPROVAL_STATUS.APPROVED
          : APPROVAL_STATUS.PENDING;
    }

    const currentUserStatus = normalizeUserStatus(
      currentProvider.status,
      currentProvider.isActive
    );
    const nextUserStatus =
      nextApprovalStatus === APPROVAL_STATUS.REJECTED
        ? USER_STATUS.REJECTED
        : nextApprovalStatus === APPROVAL_STATUS.APPROVED
          ? USER_STATUS.ACTIVE
          : currentUserStatus === USER_STATUS.SUSPENDED
            ? USER_STATUS.SUSPENDED
            : USER_STATUS.ACTIVE;

    const user = await User.findByIdAndUpdate(
      providerId,
      {
        status: nextUserStatus,
        isActive: nextUserStatus === USER_STATUS.ACTIVE,
        approvalStatus: nextApprovalStatus,
      },
      { new: true },
    ).select("-password");

    if (!user) {
      throw new Error("Provider not found");
    }

    await createNotification({
      userId: providerId,
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
      userIds: [providerId],
      eventName: SOCKET_EVENTS.USER_STATUS_UPDATED,
      payload: {
        userId: providerId,
        status: nextUserStatus,
        approvalStatus: nextApprovalStatus,
        message: `Your provider approval status is now ${nextApprovalStatus}.`,
      },
    });

    if (nextApprovalStatus === APPROVAL_STATUS.APPROVED || nextApprovalStatus === APPROVAL_STATUS.REJECTED || nextApprovalStatus === APPROVAL_STATUS.PENDING) {
      emitSocketEvent({
        rooms: ["role_client", "role_admin"],
        eventName: "providers_updated",
        payload: {
          providerId,
          status: nextUserStatus,
          approvalStatus: nextApprovalStatus,
        },
      });
    }

    return user;
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
    const user = await User.findById(providerId).select("-password");

    if (!user) {
      throw new Error("Provider not found");
    }

    return {
      ...user.toObject(),
      status: normalizeUserStatus(
        user.status,
        user.isActive
      ),
      approvalStatus: normalizeApprovalStatus(user.approvalStatus, {
        role: user.role,
        status: normalizeUserStatus(
          user.status,
          user.isActive
        ),
      }),
      isApproved:
        normalizeApprovalStatus(user.approvalStatus, {
          role: user.role,
          status: normalizeUserStatus(
            user.status,
            user.isActive
          ),
        }) === APPROVAL_STATUS.APPROVED,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateUserVerificationStatus = async (
  userId,
  verificationInput,
  rejectionReason = "",
  reviewedBy = null
) => {
  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    const nextVerificationStatus = normalizeVerificationStatus(
      verificationInput,
      user.isVerified
    );

    if (
      ![
        VERIFICATION_STATUS.UNDER_REVIEW,
        VERIFICATION_STATUS.VERIFIED,
        VERIFICATION_STATUS.REJECTED,
      ].includes(nextVerificationStatus)
    ) {
      throw new Error("Invalid verification status");
    }

    const trimmedRejectionReason = String(rejectionReason || "").trim();

    if (!Array.isArray(user.verification?.documents) || !user.verification.documents.length) {
      throw new Error("This user has not submitted any verification documents.");
    }

    if (
      nextVerificationStatus === VERIFICATION_STATUS.REJECTED &&
      !trimmedRejectionReason
    ) {
      throw new Error("Rejection reason is required.");
    }

    user.verification = {
      ...(user.verification?.toObject ? user.verification.toObject() : user.verification),
      status: nextVerificationStatus,
      reviewedAt:
        nextVerificationStatus === VERIFICATION_STATUS.UNDER_REVIEW
          ? null
          : new Date(),
      reviewedBy:
        nextVerificationStatus === VERIFICATION_STATUS.UNDER_REVIEW
          ? null
          : reviewedBy || null,
      rejectionReason:
        nextVerificationStatus === VERIFICATION_STATUS.REJECTED
          ? trimmedRejectionReason
          : "",
    };
    user.isVerified = nextVerificationStatus === VERIFICATION_STATUS.VERIFIED;
    await user.save();

    const message =
      nextVerificationStatus === VERIFICATION_STATUS.VERIFIED
        ? "Your verification documents were approved."
        : nextVerificationStatus === VERIFICATION_STATUS.REJECTED
          ? `Verification rejected: ${trimmedRejectionReason}`
          : "Your verification documents are under review.";

    await createNotification({
      userId,
      title: "Verification updated",
      message,
      type: "account",
      actionUrl:
        String(user.role || "").toLowerCase() === "provider"
          ? "/provider/verification"
          : "/client/verification",
      metadata: {
        verificationStatus: nextVerificationStatus,
        rejectionReason:
          nextVerificationStatus === VERIFICATION_STATUS.REJECTED
            ? trimmedRejectionReason
            : "",
      },
    });

    emitSocketEvent({
      userIds: [userId],
      eventName: SOCKET_EVENTS.USER_UPDATED,
      payload: {
        userId,
        verificationStatus: nextVerificationStatus,
        rejectionReason:
          nextVerificationStatus === VERIFICATION_STATUS.REJECTED
            ? trimmedRejectionReason
            : "",
        message,
      },
    });

    return user;
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
  updateUserVerificationStatus,
  getUserById,
  getProviderById,
};
