const mongoose = require("mongoose");
const {
  TRANSACTION_STATUS_VALUES,
  toTransactionPersistenceStatus,
} = require("../utils/transactionStatus");

const transactionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    clientPlatformFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    providerPlatformFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalPaidByClient: {
      type: Number,
      min: 0,
      default: 0,
    },
    netToProvider: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformRevenue: {
      type: Number,
      min: 0,
      default: 0,
    },
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
    paymentMethod: {
      type: String,
      required: true, // e.g., "card", "upi", "cash"
    },
    transactionId: {
      type: String, // from payment gateway
      trim: true,
    },
    serviceSnapshot: {
      serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
      title: {
        type: String,
        trim: true,
        default: "",
      },
      category: {
        type: String,
        trim: true,
        default: "",
      },
      duration: {
        type: String,
        trim: true,
        default: "",
      },
      locationType: {
        type: String,
        trim: true,
        default: "",
      },
      services: [
        {
          serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
          },
          title: {
            type: String,
            trim: true,
            default: "",
          },
          category: {
            type: String,
            trim: true,
            default: "",
          },
          price: {
            type: Number,
            min: 0,
            default: 0,
          },
          duration: {
            type: String,
            trim: true,
            default: "",
          },
          locationType: {
            type: String,
            trim: true,
            default: "",
          },
        },
      ],
    },
    clientPaymentSnapshot: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      bankName: {
        type: String,
        trim: true,
        default: "",
      },
      upiId: {
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
    },
    providerPaymentSnapshot: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      bankName: {
        type: String,
        trim: true,
        default: "",
      },
      upiId: {
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
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUS_VALUES,
      default: "pending",
      set: (value) => toTransactionPersistenceStatus(value),
    },
  },
  { timestamps: true }
);

// Indexes for improved admin query performance
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ clientId: 1 });
transactionSchema.index({ providerId: 1 });
transactionSchema.index({ transactionId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
