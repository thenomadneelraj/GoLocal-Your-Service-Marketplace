require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Dispute = require("../models/Dispute");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Service = require("../models/Service");

async function insertMockAdminDispute() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Use a generated ObjectId but store mapping for client string lookup
    const mockObjectId = new mongoose.Types.ObjectId(
      "507f1f77bcf86cd799439011",
    ); // Fixed valid ObjectId hex for "mock-admin-dispute-1"

    // Check if already exists
    const existing = await Dispute.findById(mockObjectId);
    if (existing) {
      console.log("⚠️ Mock dispute already exists, skipping...");
      process.exit(0);
    }

    // Minimal mock users
    let clientUser = await User.findOne({ email: "ishan.mock@golocal.test.com" });
    if (!clientUser) {
      clientUser = new User({
        name: "Ishan Rao",
        email: "ishan.mock@golocal.test.com",
        password: "MockPass123!",
        role: "client",
        status: "active",
      });
      await clientUser.save();
      console.log("Created client user:", clientUser._id);
    }

    let providerUser = await User.findOne({ email: "maya.mock@golocal.test.com" });
    if (!providerUser) {
      providerUser = new User({
        name: "Maya Torres",
        email: "maya.mock@golocal.test.com",
        password: "MockPass123!",
        role: "provider",
        status: "active",
      });
      await providerUser.save();
      console.log("Created provider user:", providerUser._id);
    }

    // Mock service
    let mockService = await Service.findOne({ title: "Mock Cleaning Service", providerId: providerUser._id });
    if (!mockService) {
      mockService = new Service({
        title: "Mock Cleaning Service",
        description: "Professional home cleaning service",
        category: "Cleaning",
        providerId: providerUser._id,
        price: 3200,
        duration: "2 hours",
        locationType: "offline",
      });
      await mockService.save();
      console.log("Created mock service:", mockService._id);
    }

    // Mock booking
    let mockBooking = await Booking.findOne({ clientId: clientUser._id, providerId: providerUser._id }).sort({ createdAt: -1 });
    if (!mockBooking) {
      mockBooking = new Booking({
        clientId: clientUser._id,
        providerId: providerUser._id,
        serviceId: mockService._id,
        bookingDate: new Date(),
        timeSlot: "10:00 AM - 12:00 PM",
        status: "completed",
        price: 3200,
        address: "123 Mock Street, Test City",
      });
      await mockBooking.save();
      console.log("Created mock booking:", mockBooking._id);
    }

    // Insert mock dispute
    const mockDispute = new Dispute({
      _id: mockObjectId,
      bookingId: mockBooking._id,
      reporterId: clientUser._id,
      clientId: clientUser._id,
      providerId: providerUser._id,
      targetUserId: providerUser._id,
      targetType: "provider",
      threadKey: "mock-admin-thread-1",
      subject: "Missed arrival window",
      reason: "Late Arrival",
      description:
        "The provider confirmed the appointment but arrived significantly after the agreed time window.",
      status: "under_review",
      resolutionNote: "",
    });

    await mockDispute.save();

    console.log("🎉 Mock admin dispute inserted!");
    console.log("ObjectId:", mockObjectId.toString());
    console.log(
      '💡 Client UI uses "mock-admin-dispute-1". Update client mock data ID to this ObjectId or vice versa for exact match.',
    );
    console.log("PATCH endpoint now functional for this dispute.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
 }
}

insertMockAdminDispute();