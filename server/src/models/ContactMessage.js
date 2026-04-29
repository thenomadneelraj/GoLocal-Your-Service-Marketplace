const mongoose = require("mongoose");

const CONTACT_MESSAGE_STATUSES = ["pending", "in_progress", "resolved", "closed"];

const contactMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userRole: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: "support",
    },
    status: {
      type: String,
      enum: CONTACT_MESSAGE_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
