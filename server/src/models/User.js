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
const {
  generateUpiId,
  sanitizePhone,
  sanitizeAccountNumber,
} = require("../utils/payment");
const {
  VERIFICATION_STATUS,
  VERIFICATION_STATUS_VALUES,
  normalizeVerificationStatus,
} = require("../utils/verification");

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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    upiId: {
      type: String,
      default: undefined,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
      default: "",
    },
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },
    accountHolderName: {
      type: String,
      trim: true,
      default: "",
    },
    workCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    serviceType: {
      type: String,
      default: "Other",
    },
    bio: {
      type: String,
      default: "",
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    location: {
      type: String,
      default: "",
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    experience: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    earnings: {
      type: Number,
      default: 0,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    documents: [String],
    permissions: [String],
    platformSettings: {
      platformName: {
        type: String,
        trim: true,
        default: undefined,
      },
      supportEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: undefined,
      },
      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: undefined,
      },
      commissionPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: undefined,
      },
      maintenanceMode: {
        type: Boolean,
        default: undefined,
      },
      maintenanceMessage: {
        type: String,
        trim: true,
        default: undefined,
      },
      controlDepth: {
        type: String,
        trim: true,
        default: undefined,
      },
      automationProfile: {
        type: String,
        trim: true,
        default: undefined,
      },
      reminderWindowLabel: {
        type: String,
        trim: true,
        default: undefined,
      },
      exportRetentionDays: {
        type: Number,
        min: 1,
        default: undefined,
      },
      manualProviderReview: {
        type: Boolean,
        default: undefined,
      },
      disputeEscalationHours: {
        type: Number,
        min: 1,
        default: undefined,
      },
      bookingReminderHours: {
        type: Number,
        min: 1,
        default: undefined,
      },
      websocketMonitoring: {
        type: Boolean,
        default: undefined,
      },
      lastCacheClearedAt: {
        type: Date,
        default: undefined,
      },
      clientApprovalBackfilledAt: {
        type: Date,
        default: undefined,
      },
      lastExportedAt: {
        type: Date,
        default: undefined,
      },
      lastSecurityAuditAt: {
        type: Date,
        default: undefined,
      },
    },
    verification: {
      status: {
        type: String,
        enum: VERIFICATION_STATUS_VALUES,
        default: VERIFICATION_STATUS.NOT_SUBMITTED,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: "",
      },
      documents: [
        {
          kind: {
            type: String,
            trim: true,
            required: true,
          },
          label: {
            type: String,
            trim: true,
            default: "",
          },
          originalName: {
            type: String,
            trim: true,
            required: true,
          },
          name: {
            type: String,
            trim: true,
            required: true,
          },
          storedName: {
            type: String,
            trim: true,
            default: "",
          },
          filePath: {
            type: String,
            trim: true,
            default: "",
          },
          mimeType: {
            type: String,
            trim: true,
            default: "",
          },
          size: {
            type: Number,
            default: 0,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    status: {
      type: String,
      enum: USER_STATUS_VALUES,
      default: USER_STATUS.ACTIVE,
    },
    isMock: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUS_VALUES,
      default: function approvalStatusDefault() {
        return String(this.role || "").toLowerCase() === "admin"
          ? APPROVAL_STATUS.APPROVED
          : APPROVAL_STATUS.PENDING;
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

userSchema.pre("validate", function syncOperationalState() {
  const normalizedPhone = sanitizePhone(this.phone || "");
  this.phone = normalizedPhone || undefined;
  this.bankName = String(this.bankName || "").trim();
  this.accountNumber = sanitizeAccountNumber(this.accountNumber || "");
  this.accountHolderName = String(
    this.accountHolderName || this.name || ""
  ).trim();
  this.workCategories = Array.from(
    new Set(
      (Array.isArray(this.workCategories) ? this.workCategories : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
  const generatedUpiId = generateUpiId({
    phone: this.phone,
    bankName: this.bankName,
  });
  this.upiId = generatedUpiId || undefined;
  if (!this.verification) {
    this.verification = {};
  }
  this.verification.documents = (Array.isArray(this.verification.documents)
    ? this.verification.documents
    : []
  ).map((document) => {
    const originalName = String(
      document?.originalName || document?.name || ""
    ).trim();

    return {
      ...document,
      originalName,
      name: originalName,
      storedName: String(document?.storedName || "").trim(),
      filePath: String(document?.filePath || "").trim(),
    };
  });
  this.verification.status = normalizeVerificationStatus(
    this.verification.status,
    this.isVerified
  );
  this.isVerified =
    this.verification.status === VERIFICATION_STATUS.VERIFIED;
  this.status = normalizeUserStatus(this.status, this.isActive);
  this.isActive = this.status === USER_STATUS.ACTIVE;
  this.approvalStatus = normalizeApprovalStatus(this.approvalStatus, {
    role: this.role,
    status: this.status,
  });
});

userSchema.index(
  { upiId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      upiId: { $type: "string", $gt: "" },
    },
  }
);

// Indexes for improved admin query performance
userSchema.index({ role: 1, approvalStatus: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ status: 1 });
userSchema.index({ approvalStatus: 1 });
userSchema.index({ name: "text", email: "text" });
userSchema.index({ "verification.status": 1 });
userSchema.index({ lastLogin: -1 });

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
