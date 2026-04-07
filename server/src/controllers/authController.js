const User = require("../models/User");
const Admin = require("../models/Admin");
const Provider = require("../models/Provider");
const Client = require("../models/Client");
const LoginHistory = require("../models/LoginHistory");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const {
  buildMaintenanceResponse,
  getPlatformStatus,
} = require("../middleware/maintenance");
const { buildAccountAccessState } = require("../middleware/accountAccess");
const {
  USER_STATUS,
  APPROVAL_STATUS,
  buildPersistedAccountState,
  normalizeApprovalStatus,
} = require("../utils/accountState");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");

const generateToken = (account, accountType = "USER") => {
  return jwt.sign(
    { accountId: account._id, role: account.role, accountType },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const shapeAccount = (user, profile) => {
  const operationalState = buildPersistedAccountState({
    role: user?.role,
    status: user?.status,
    isActive: user?.isActive,
    approvalStatus: user?.approvalStatus,
    isApproved: profile?.isApproved,
  });

  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    status: operationalState.status,
    approvalStatus: operationalState.approvalStatus,
    isActive: operationalState.isActive,
  };

  // Admin and fallback handling
  if (user.role === "admin" || !profile) {
    if (user.name) payload.name = user.name;
    if (user.phone) payload.phone = user.phone;
    if (user.address) payload.address = user.address;
    if (user.profileImage || user.profilePhoto) {
      payload.profilePhoto = user.profileImage || user.profilePhoto;
    }
    return payload; // For Admin model or incomplete queries
  }

  if (profile) {
    if (profile.name) payload.name = profile.name;
    if (profile.phone) payload.phone = profile.phone;
    if (profile.address) payload.address = profile.address;
    if (profile.profileImage || profile.profilePhoto) {
      payload.profilePhoto = profile.profileImage || profile.profilePhoto;
    }
    if (user.role === "provider" || user.role === "PROVIDER") {
      payload.isApproved =
        normalizeApprovalStatus(operationalState.approvalStatus, {
          role: user.role,
          isApproved: profile?.isApproved,
          status: operationalState.status,
        }) === APPROVAL_STATUS.APPROVED;
      payload.services = profile.services;
    }
  }

  return payload;
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

    const { name, firstName, lastName, email, phone, password, role, profilePhoto, serviceType } =
      req.body;

    const actualName = name || `${firstName || ""} ${lastName || ""}`.trim();

    if (role === "ADMIN" || role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin registration is not allowed from this route.",
      });
    }

    const platformStatus = await getPlatformStatus();
    if (platformStatus.maintenanceMode) {
      return res.status(503).json(buildMaintenanceResponse(platformStatus));
    }

    const assignedRole = (role === "PROVIDER" || role === "provider") ? "provider" : "client";

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const existingPhoneInClient = await Client.findOne({ phone });
    const existingPhoneInProvider = await Provider.findOne({ phone });
    if (existingPhoneInClient || existingPhoneInProvider) {
      return res.status(400).json({
        success: false,
        message: "Phone already registered",
      });
    }

    const user = await User.create({
      email,
      password,
      role: assignedRole,
      status: USER_STATUS.ACTIVE,
      approvalStatus:
        assignedRole === "provider"
          ? APPROVAL_STATUS.PENDING
          : APPROVAL_STATUS.APPROVED,
    });

    let profile;
    if (assignedRole === "provider") {
      profile = await Provider.create({
        userId: user._id,
        name: actualName,
        phone,
        upiId: phone ? `${phone}@golocal` : "",
        profileImage: profilePhoto || "",
        serviceType: serviceType || "Other",
        services: [], // can be populated later
        experience: 0,
        availability: true,
      });
    } else {
      profile = await Client.create({
        userId: user._id,
        name: actualName,
        phone,
        profileImage: profilePhoto || "",
      });
    }

    const token = generateToken(user);
    const userPayload = shapeAccount(user, profile);

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
    let wantsAdmin = (role === "ADMIN" || role === "admin");
    let accountType = wantsAdmin ? "ADMIN" : "USER";

    let account = wantsAdmin
      ? await Admin.findOne({ email }).select("+password")
      : await User.findOne({ email }).select("+password");

    if (!account && (!role || role === "")) {
      // allow fallback
      account = await Admin.findOne({ email }).select("+password");
      if (account) {
        accountType = "ADMIN";
        wantsAdmin = true;
      }
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const bcrypt = require("bcrypt");
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const roleLower = role ? role.toLowerCase() : null;
    const accountRoleLower = account.role ? account.role.toLowerCase() : null;

    if (roleLower && accountRoleLower && roleLower !== accountRoleLower) {
        return res.status(403).json({
            success: false,
            message: "Role mismatch for this account.",
        });
    }

    if (accountType !== "ADMIN") {
      const platformStatus = await getPlatformStatus();
      if (platformStatus.maintenanceMode) {
        return res.status(503).json(buildMaintenanceResponse(platformStatus));
      }
    }

    let profile = null;
    if (accountType === "USER") {
      if (account.role === "client") {
        profile = await Client.findOne({ userId: account._id });
      } else if (account.role === "provider") {
        profile = await Provider.findOne({ userId: account._id });
      }

      // Use updateOne to avoid triggering full model validators on unrelated fields
      // (avoids ValidationErrors from stale/legacy data in existing documents)
      await account.constructor.findByIdAndUpdate(account._id, {
        $inc: { totalLogins: 1 },
        $set: { lastLogin: new Date() },
      });
    } else {
      profile = account;
    }

    const token = generateToken(account, accountType);
    const userPayload = shapeAccount(account, profile);

    LoginHistory.create({
      accountId: account._id,
      account: account.email || String(account._id),
      accountModel: accountType === "ADMIN" ? "Admin" : "User",
      role: account.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
      success: true,
      loginTime: new Date(),
    }).catch(() => {});

    res.json({
      success: true,
      message: "Login successful TEST",
      token,
      user: userPayload,
      data: {
        user: userPayload,
        token,
      },
    });
  } catch (error) {
    console.error("SIGNIN FULL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = req.user; 
    let profile = null;

    if (req.auth?.accountType === "ADMIN") {
      profile = user;
    } else {
      if (user.role === "client") {
        profile = await Client.findOne({ userId: user._id });
      } else if (user.role === "provider") {
        profile = await Provider.findOne({ userId: user._id });
      }
    }

    const userPayload = shapeAccount(user, profile);
    const accountAccess = await buildAccountAccessState(user);

    res.json({
      success: true,
      user: {
        ...userPayload,
        status: userPayload.status || accountAccess.status,
        approvalStatus:
          userPayload.approvalStatus || accountAccess.approvalStatus,
        isApproved: accountAccess.isApproved,
      },
      data: {
        user: {
          ...userPayload,
          status: userPayload.status || accountAccess.status,
          approvalStatus:
            userPayload.approvalStatus || accountAccess.approvalStatus,
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

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { name, firstName, lastName, phone, profilePhoto, address } = req.body;
    
    const actualName = name || (firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined);

    let updatedUser;
    let profile = null;

    if (req.auth?.accountType === "ADMIN") {
      const updateData = {};
      if (actualName) updateData.name = actualName;
      if (phone) {
        const existingPhone = await Admin.findOne({ phone });
        if (existingPhone && existingPhone._id.toString() !== userId) {
          return res.status(400).json({ success: false, message: "Phone already registered" });
        }
        updateData.phone = phone;
      }
      if (address !== undefined) updateData.address = address;
      if (profilePhoto) {
         updateData.profileImage = profilePhoto; 
      }
      updatedUser = await Admin.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
      profile = updatedUser;
    } else {
      updatedUser = req.user; 

      const updateData = {};
      if (actualName) updateData.name = actualName;
      if (phone) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (profilePhoto) {
         updateData.profileImage = profilePhoto; 
      }

      if (updatedUser.role === "client") {
        if (phone) {
          const existingPhone = await Client.findOne({ phone });
          if (existingPhone && existingPhone.userId.toString() !== userId) {
            return res.status(400).json({ success: false, message: "Phone already registered" });
          }
        }
        profile = await Client.findOneAndUpdate({ userId }, updateData, { new: true });
      } else if (updatedUser.role === "provider") {
        if (phone) {
          const existingPhone = await Provider.findOne({ phone });
          if (existingPhone && existingPhone.userId.toString() !== userId) {
            return res.status(400).json({ success: false, message: "Phone already registered" });
          }
        }
        profile = await Provider.findOneAndUpdate({ userId }, updateData, { new: true });
      }
    }

    const payload = shapeAccount(updatedUser, profile);

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
    
    let account;
    if (req.auth?.accountType === "ADMIN") {
      account = await Admin.findById(userId).select("+password");
    } else {
      account = await User.findById(userId).select("+password");
    }

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const isMatch = await account.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    account.password = newPassword;
    await account.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    if (req.auth?.accountType === "ADMIN") {
      await Admin.findByIdAndDelete(userId);
    } else {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: "Account not found" });

      if (user.role === "provider") {
        await Provider.findOneAndDelete({ userId });
      } else if (user.role === "client") {
        await Client.findOneAndDelete({ userId });
      }
      await User.findByIdAndDelete(userId);
    }

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  updateProfile,
  changePassword,
  deleteAccount,
  logout,
};
