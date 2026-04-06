const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
  USER_STATUS,
  USER_STATUS_VALUES,
  APPROVAL_STATUS,
  APPROVAL_STATUS_VALUES,
  normalizeUserStatus,
  normalizeApprovalStatus,
} = require("../utils/accountState");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["client", "provider", "admin"],
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUS_VALUES,
      default: USER_STATUS.ACTIVE,
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUS_VALUES,
      default: function approvalStatusDefault() {
        return String(this.role || "").toLowerCase() === "provider"
          ? APPROVAL_STATUS.PENDING
          : APPROVAL_STATUS.APPROVED;
      },
    },
    totalLogins: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.pre("validate", function syncOperationalState(next) {
  this.status = normalizeUserStatus(this.status, this.isActive);
  this.isActive = this.status === USER_STATUS.ACTIVE;
  this.approvalStatus = normalizeApprovalStatus(this.approvalStatus, {
    role: this.role,
    status: this.status,
  });
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
