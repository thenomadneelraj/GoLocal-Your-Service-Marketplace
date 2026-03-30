const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

// Authenticate
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Handle different token formats - check for id, accountId, or userId
      const accountId = decoded.accountId || decoded.userId || decoded.id;

      if (!accountId) {
        return res.status(401).json({
          success: false,
          message: "Invalid token: missing account ID",
        });
      }

      const isAdminToken =
        decoded.accountType === "ADMIN" || decoded.role === "ADMIN";

      const account = isAdminToken
        ? await Admin.findById(accountId).select("-password")
        : await User.findById(accountId).select("-password");

      if (!account) {
        return res.status(401).json({
          success: false,
          message: "User not found.",
        });
      }

      req.user = account;
      req.auth = {
        accountType: isAdminToken ? "ADMIN" : "USER",
      };
      next();
    } catch (jwtError) {
      console.error("JWT Error:", jwtError.message);
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Optional Auth
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const isAdminToken =
        decoded.accountType === "ADMIN" || decoded.role === "ADMIN";
      // Handle different token formats - check for id, accountId, or userId
      const accountId = decoded.accountId || decoded.userId || decoded.id;
      const user = isAdminToken
        ? await Admin.findById(accountId).select("-password")
        : await User.findById(accountId).select("-password");

      if (user) req.user = user;
    } catch (err) {
      // ignore
    }

    next();
  } catch (error) {
    next();
  }
};

// Role Authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Normalize roles to lowercase for comparison
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const normalizedRoles = roles.map(role => role.toLowerCase());
    
    if (roles.length && !normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};
