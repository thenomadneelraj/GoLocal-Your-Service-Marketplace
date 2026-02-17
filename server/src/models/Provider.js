const mongoose = require("mongoose");

const providerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  serviceType: {
    type: String,
    required: true
  },
  bio: String,
  hourlyRate: Number,
  yearsExperience: Number,
  location: String,
  available: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Provider", providerSchema);
