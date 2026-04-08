const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Plumbing", "Electrical", "Cleaning", "Painting", "Carpentry", "AC Repair", "Appliance Repair", "Moving", "Other"],
      default: "Other",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ServiceNew", serviceSchema);
