const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  buildMaintenanceResponse,
  getPlatformStatus,
} = require("../middleware/maintenance");
const { buildAccountAccessState } = require("../middleware/accountAccess");
const {
  USER_STATUS,
  APPROVAL_STATUS,
  buildPersistedAccountState,
  isUserApproved,
} = require("../utils/accountState");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");
const { generateUpiId } = require("../utils/payment");
const { createNotification } = require("../services/notificationService");
const {
  VERIFICATION_STATUS,
  VERIFICATION_DOCUMENT_LABELS,
  normalizeVerificationStatus,
  getRequiredVerificationDocumentKinds,
  serializeVerificationDocument,
} = require("../utils/verification");
const {
  deleteStoredVerificationFile,
  deleteVerificationDocuments,
} = require("../utils/verificationFiles");

const generateToken = (account, accountType = "USER") =>
  jwt.sign(
    { accountId: account._id, role: account.role, accountType },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

const normalizeWorkCategories = (value, primaryCategory = "") => {
  const categories = Array.from(
    new Set(
      (Array.isArray(value) ? value : [value])
        .flatMap((entry) =>
          typeof entry === "string"
            ? entry.split(",")
            : Array.isArray(entry)
              ? entry
              : [entry]
        )
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    )
  );

  const normalizedPrimary = String(primaryCategory || "").trim();
  if (normalizedPrimary && !categories.includes(normalizedPrimary)) {
    categories.unshift(normalizedPrimary);
  }

  return categories;
};

const buildStoredVerificationDocuments = (files = {}, role = "") => {
  const requiredKinds = getRequiredVerificationDocumentKinds(role);

  return requiredKinds
    .map((kind) => {
      const file = Array.isArray(files?.[kind]) ? files[kind][0] : null;
      if (!file) return null;

      const originalName = String(file.originalname || "").trim() || "Document";

      return {
        kind,
        label: VERIFICATION_DOCUMENT_LABELS[kind] || "Document",
        originalName,
        name: originalName,
        storedName: String(file.filename || "").trim(),
        filePath: `/uploads/verification/${String(file.filename || "").trim()}`,
        mimeType: String(file.mimetype || "").trim(),
        size: Number(file.size || 0),
        uploadedAt: new Date(),
      };
    })
    .filter(Boolean);
};

const collectUploadedVerificationPaths = (files = {}) =>
  Object.values(files || {})
    .flat()
    .map((file) =>
      file?.filename ? `/uploads/verification/${String(file.filename).trim()}` : ""
    )
    .filter(Boolean);

const cleanupUploadedVerificationFiles = async (files = {}) => {
  await Promise.allSettled(
    collectUploadedVerificationPaths(files).map((filePath) =>
      deleteStoredVerificationFile(filePath)
    )
  );
};

const shapeAccount = (user) => {
  const operationalState = buildPersistedAccountState({
    role: user.role,
    status: user.status,
    isActive: user.isActive,
    approvalStatus: user.approvalStatus,
  });

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || "",
    profileImage: user.profileImage || "",
    profilePhoto: user.profileImage || "",
    bankName: user.bankName || "",
    accountNumber: user.accountNumber || "",
    accountHolderName: user.accountHolderName || user.name || "",
    upiId:
      user.upiId ||
      generateUpiId({ phone: user.phone, bankName: user.bankName }),
    serviceType: user.serviceType || "",
    workCategories: Array.isArray(user.workCategories) ? user.workCategories : [],
    isVerified: Boolean(user.isVerified),
    verificationStatus: normalizeVerificationStatus(
      user.verification?.status,
      user.isVerified
    ),
    verificationSubmittedAt: user.verification?.submittedAt || null,
    verificationReviewedAt: user.verification?.reviewedAt || null,
    verificationRejectionReason: user.verification?.rejectionReason || "",
    verificationDocuments: Array.isArray(user.verification?.documents)
      ? user.verification.documents.map((document) =>
          serializeVerificationDocument(document)
        )
      : [],
    availability: typeof user.availability === "boolean" ? user.availability : true,
    status: operationalState.status,
    approvalStatus: operationalState.approvalStatus,
    isActive: operationalState.isActive,
    isApproved: isUserApproved(user),
  };
};

const buildVerificationPayload = (user) => {
  const role = String(user?.role || "").toLowerCase();
  const verificationStatus = normalizeVerificationStatus(
    user?.verification?.status,
    user?.isVerified
  );

  return {
    role,
    isVerified: verificationStatus === VERIFICATION_STATUS.VERIFIED,
    verificationStatus,
    submittedAt: user?.verification?.submittedAt || null,
    reviewedAt: user?.verification?.reviewedAt || null,
    rejectionReason: user?.verification?.rejectionReason || "",
    requiredDocuments: getRequiredVerificationDocumentKinds(role).map((kind) => ({
      kind,
      label: VERIFICATION_DOCUMENT_LABELS[kind] || "Document",
    })),
    documents: Array.isArray(user?.verification?.documents)
      ? user.verification.documents.map((document) =>
          serializeVerificationDocument(document)
        )
      : [],
  };
};

const notifyAdminsOfVerificationSubmission = async (user) => {
  const admins = await User.find({ role: "admin" }).select("_id");

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        title: "Verification submitted",
        message: `${user.name || user.email} submitted verification documents.`,
        type: "account",
        actionUrl: "/admin/verification",
        metadata: {
          userId: String(user._id),
          verificationStatus: normalizeVerificationStatus(
            user.verification?.status,
            user.isVerified
          ),
        },
      })
    )
  );
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      profilePhoto,
      serviceType,
      workCategories,
    } = req.body;

    const actualName =
      String(name || "").trim() ||
      `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();

    if (!actualName) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (String(role || "").toLowerCase() === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin registration is not allowed from this route.",
      });
    }

    const platformStatus = await getPlatformStatus();
    if (platformStatus.maintenanceMode) {
      return res.status(503).json(buildMaintenanceResponse(platformStatus));
    }

    const assignedRole =
      String(role || "").toLowerCase() === "provider" ? "provider" : "client";
    const normalizedServiceType =
      assignedRole === "provider"
        ? String(serviceType || "").trim() || "Other"
        : "Other";
    const normalizedWorkCategories =
      assignedRole === "provider"
        ? normalizeWorkCategories(workCategories, normalizedServiceType)
        : [];

    if (assignedRole === "provider" && !normalizedWorkCategories.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one work category for provider accounts.",
      });
    }

    const existingEmail = await User.findOne({
      email: String(email || "").trim().toLowerCase(),
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const normalizedPhone = String(phone || "").trim();
    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone already registered",
        });
      }
    }

    const user = await User.create({
      email: String(email || "").trim().toLowerCase(),
      password,
      role: assignedRole,
      name: actualName,
      phone: normalizedPhone,
      profileImage: String(profilePhoto || "").trim(),
      serviceType: normalizedServiceType,
      workCategories: normalizedWorkCategories,
      availability: assignedRole === "provider",
      status: USER_STATUS.ACTIVE,
      approvalStatus: APPROVAL_STATUS.PENDING,
    });

    const token = generateToken(user);
    const userPayload = shapeAccount(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: userPayload,
      data: {
        user: userPayload,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const signIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, role } = req.body;

    const account = await User.findOne({
      email: String(email || "").trim().toLowerCase(),
    }).select("+password");

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const requestedRole = String(role || "").trim().toLowerCase();
    const actualRole = String(account.role || "").trim().toLowerCase();

    if (requestedRole && requestedRole !== actualRole) {
      return res.status(403).json({
        success: false,
        message: "Role mismatch for this account.",
      });
    }

    if (actualRole !== "admin") {
      const platformStatus = await getPlatformStatus();
      if (platformStatus.maintenanceMode) {
        return res.status(503).json(buildMaintenanceResponse(platformStatus));
      }
    }

    account.totalLogins = Number(account.totalLogins || 0) + 1;
    account.lastLogin = new Date();
    await account.save();

    const token = generateToken(account, actualRole === "admin" ? "ADMIN" : "USER");
    const userPayload = shapeAccount(account);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userPayload,
      data: {
        user: userPayload,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userPayload = shapeAccount(req.user);
    const accountAccess = await buildAccountAccessState(req.user);

    res.json({
      success: true,
      user: {
        ...userPayload,
        isApproved: accountAccess.isApproved,
      },
      data: {
        user: {
          ...userPayload,
          isApproved: accountAccess.isApproved,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPlatformStatusController = async (req, res) => {
  try {
    const status = await getPlatformStatus();

    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (!["client", "provider"].includes(String(user.role || "").toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "Verification is only available for client and provider accounts.",
      });
    }

    res.json({
      success: true,
      data: buildVerificationPayload(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const submitVerification = async (req, res) => {
  let verificationSaved = false;

  try {
    const uploadedFiles = req.files || {};
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      await cleanupUploadedVerificationFiles(uploadedFiles);
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (!["client", "provider"].includes(String(user.role || "").toLowerCase())) {
      await cleanupUploadedVerificationFiles(uploadedFiles);
      return res.status(403).json({
        success: false,
        message: "Verification is only available for client and provider accounts.",
      });
    }

    const currentStatus = normalizeVerificationStatus(
      user.verification?.status,
      user.isVerified
    );

    if (currentStatus === VERIFICATION_STATUS.VERIFIED) {
      await cleanupUploadedVerificationFiles(uploadedFiles);
      return res.status(409).json({
        success: false,
        message: "This account is already verified.",
      });
    }

    if (currentStatus === VERIFICATION_STATUS.UNDER_REVIEW) {
      await cleanupUploadedVerificationFiles(uploadedFiles);
      return res.status(409).json({
        success: false,
        message: "Verification is already under review.",
      });
    }

    const documents = buildStoredVerificationDocuments(uploadedFiles, user.role);
    const requiredKinds = getRequiredVerificationDocumentKinds(user.role);
    const providedKinds = new Set(documents.map((document) => document.kind));
    const missingKinds = requiredKinds.filter((kind) => !providedKinds.has(kind));

    if (missingKinds.length) {
      await cleanupUploadedVerificationFiles(uploadedFiles);
      return res.status(400).json({
        success: false,
        message: `Missing required documents: ${missingKinds
          .map((kind) => VERIFICATION_DOCUMENT_LABELS[kind] || kind)
          .join(", ")}.`,
      });
    }

    const previousDocuments = Array.isArray(user.verification?.documents)
      ? user.verification.documents
      : [];

    user.verification = {
      ...(user.verification?.toObject
        ? user.verification.toObject()
        : user.verification),
      status: VERIFICATION_STATUS.UNDER_REVIEW,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: "",
      documents,
    };
    user.isVerified = false;
    await user.save();
    verificationSaved = true;

    const postSubmitTasks = await Promise.allSettled([
      deleteVerificationDocuments(previousDocuments),
      notifyAdminsOfVerificationSubmission(user),
    ]);

    postSubmitTasks.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Verification submission follow-up failed:", result.reason);
      }
    });

    emitSocketEvent({
      userIds: [req.user._id],
      eventName: SOCKET_EVENTS.USER_UPDATED,
      payload: {
        userId: String(req.user._id),
        verificationStatus: user.verification.status,
        message: "Verification submitted successfully.",
      },
    });

    res.status(201).json({
      success: true,
      message: "Verification submitted successfully.",
      data: buildVerificationPayload(user),
    });
  } catch (error) {
    if (!verificationSaved) {
      await cleanupUploadedVerificationFiles(req.files || {});
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user._id.toString();
    const {
      name,
      firstName,
      lastName,
      phone,
      profilePhoto,
      address,
      bankName,
      accountNumber,
      accountHolderName,
    } = req.body;

    const actualName =
      String(name || "").trim() ||
      `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();

    const updateData = {};
    if (actualName) updateData.name = actualName;

    if (phone !== undefined) {
      const normalizedPhone = String(phone || "").trim();
      if (normalizedPhone) {
        const existingPhone = await User.findOne({
          phone: normalizedPhone,
          _id: { $ne: userId },
        });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: "Phone already registered",
          });
        }
      }
      updateData.phone = normalizedPhone;
    }

    if (address !== undefined) updateData.address = String(address || "").trim();
    if (profilePhoto !== undefined) {
      updateData.profileImage = String(profilePhoto || "").trim();
    }
    if (bankName !== undefined) updateData.bankName = String(bankName || "").trim();
    if (accountNumber !== undefined) {
      updateData.accountNumber = String(accountNumber || "").trim();
    }
    if (accountHolderName !== undefined) {
      updateData.accountHolderName = String(accountHolderName || "").trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    const payload = shapeAccount(updatedUser);

    emitSocketEvent({
      userIds: [req.user._id],
      eventName: SOCKET_EVENTS.USER_UPDATED,
      payload: {
        userId: req.user._id.toString(),
        message: "Profile updated successfully.",
      },
    });

    res.json({
      success: true,
      message: "Profile updated",
      user: payload,
      data: { user: payload },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { currentPassword, newPassword } = req.body;

    const account = await User.findById(userId).select("+password");

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    account.password = newPassword;
    await account.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const user = await User.findById(userId).select("verification.documents");

    if (Array.isArray(user?.verification?.documents) && user.verification.documents.length) {
      await deleteVerificationDocuments(user.verification.documents);
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const logout = (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
};

module.exports = {
  register,
  signIn,
  getProfile,
  getPlatformStatusController,
  getVerificationStatus,
  submitVerification,
  updateProfile,
  changePassword,
  deleteAccount,
  logout,
};
