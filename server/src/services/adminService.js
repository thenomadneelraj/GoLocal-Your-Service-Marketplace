const User = require("../models/User");
const Admin = require("../models/Admin");
const Provider = require("../models/Provider");
const Client = require("../models/Client");

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
          phone
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
      .populate("userId", "email role")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Provider.countDocuments();

    return {
      providers,
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
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true },
    ).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Verify/unverify provider
const updateProviderStatus = async (providerId, isApproved) => {
  try {
    const provider = await Provider.findByIdAndUpdate(
      providerId,
      { isApproved },
      { new: true },
    ).populate("userId", "email role");

    if (!provider) {
      throw new Error("Provider not found");
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

    return user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get single provider by ID
const getProviderById = async (providerId) => {
  try {
    const provider = await Provider.findById(providerId).populate(
      "userId",
      "email role",
    );

    if (!provider) {
      throw new Error("Provider not found");
    }

    return provider;
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
