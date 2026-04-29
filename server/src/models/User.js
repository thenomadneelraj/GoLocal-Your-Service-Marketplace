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
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
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
    works: [
      {
        title: {
          type: String,
          trim: true,
          default: "",
        },
        price: {
          type: Number,
          min: 0,
          default: 0,
        },
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
    platformSettings: {
      commissionPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 5,
      },
      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "INR",
      },
      platformName: {
        type: String,
        trim: true,
        default: "GoLocal",
      },
      supportEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: "support@golocal.com",
      },
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: {
        type: String,
        trim: true,
        default: "Website is currently under maintenance. Please check back soon.",
      },
      controlDepth: {
        type: String,
        trim: true,
        default: "High",
      },
      automationProfile: {
        type: String,
        trim: true,
        default: "Managed",
      },
      reminderWindowLabel: {
        type: String,
        trim: true,
        default: "24h",
      },
      exportRetentionDays: {
        type: Number,
        min: 1,
        default: 30,
      },
      manualProviderReview: {
        type: Boolean,
        default: true,
      },
      disputeEscalationHours: {
        type: Number,
        min: 1,
        default: 4,
      },
      bookingReminderHours: {
        type: Number,
        min: 1,
        default: 24,
      },
      websocketMonitoring: {
        type: Boolean,
        default: true,
      },
      lastCacheClearedAt: {
        type: Date,
        default: null,
      },
      clientApprovalBackfilledAt: {
        type: Date,
        default: null,
      },
      lastExportedAt: {
        type: Date,
        default: null,
      },
      lastSecurityAuditAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
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
    this.accountHolderName || this.name || "",
  ).trim();
  this.workCategories = Array.from(
    new Set(
      (Array.isArray(this.workCategories) ? this.workCategories : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
  const generatedUpiId = generateUpiId({
    phone: this.phone,
    bankName: this.bankName,
  });
  this.upiId = generatedUpiId || undefined;
  if (!this.verification) {
    this.verification = {};
  }
  this.verification.documents = (
    Array.isArray(this.verification.documents)
      ? this.verification.documents
      : []
  ).map((document) => {
    const originalName = String(
      document?.originalName || document?.name || "",
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
    this.isVerified,
  );
  this.isVerified = this.verification.status === VERIFICATION_STATUS.VERIFIED;
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
  },
);

// Essential indexes only
userSchema.index({ role: 1, approvalStatus: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
