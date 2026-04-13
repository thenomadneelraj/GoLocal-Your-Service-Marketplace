/**
 * Script to create database indexes for improved admin query performance
 * Run this script once to add indexes to existing collections
 */

const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/golocal");
    console.log("MongoDB connected for index creation");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  console.log("Creating database indexes for admin performance...");

  // Get collections
  const db = mongoose.connection.db;

  // 1. Users collection indexes
  try {
    await db.collection("users").createIndex({ role: 1, approvalStatus: 1 });
    console.log("✓ Created index on users: role, approvalStatus");
  } catch (error) {
    console.log("Index may already exist on users: role, approvalStatus");
  }

  try {
    await db.collection("users").createIndex({ createdAt: -1 });
    console.log("✓ Created index on users: createdAt");
  } catch (error) {
    console.log("Index may already exist on users: createdAt");
  }

  try {
    await db.collection("users").createIndex({ email: 1 });
    console.log("✓ Created index on users: email");
  } catch (error) {
    console.log("Index may already exist on users: email");
  }

  try {
    await db.collection("users").createIndex({ name: "text", email: "text" });
    console.log("✓ Created text index on users: name, email");
  } catch (error) {
    console.log("Index may already exist on users: text index");
  }

  try {
    await db.collection("users").createIndex({ status: 1 });
    console.log("✓ Created index on users: status");
  } catch (error) {
    console.log("Index may already exist on users: status");
  }

  // 2. Bookings collection indexes
  try {
    await db.collection("bookings").createIndex({ status: 1, createdAt: -1 });
    console.log("✓ Created index on bookings: status, createdAt");
  } catch (error) {
    console.log("Index may already exist on bookings: status, createdAt");
  }

  try {
    await db.collection("bookings").createIndex({ clientId: 1 });
    console.log("✓ Created index on bookings: clientId");
  } catch (error) {
    console.log("Index may already exist on bookings: clientId");
  }

  try {
    await db.collection("bookings").createIndex({ providerId: 1 });
    console.log("✓ Created index on bookings: providerId");
  } catch (error) {
    console.log("Index may already exist on bookings: providerId");
  }

  try {
    await db.collection("bookings").createIndex({ serviceId: 1 });
    console.log("✓ Created index on bookings: serviceId");
  } catch (error) {
    console.log("Index may already exist on bookings: serviceId");
  }

  try {
    await db.collection("bookings").createIndex({ paymentStatus: 1 });
    console.log("✓ Created index on bookings: paymentStatus");
  } catch (error) {
    console.log("Index may already exist on bookings: paymentStatus");
  }

  // 3. Transactions collection indexes
  try {
    await db.collection("transactions").createIndex({ status: 1, createdAt: -1 });
    console.log("✓ Created index on transactions: status, createdAt");
  } catch (error) {
    console.log("Index may already exist on transactions: status, createdAt");
  }

  try {
    await db.collection("transactions").createIndex({ providerId: 1 });
    console.log("✓ Created index on transactions: providerId");
  } catch (error) {
    console.log("Index may already exist on transactions: providerId");
  }

  try {
    await db.collection("transactions").createIndex({ bookingId: 1 });
    console.log("✓ Created index on transactions: bookingId");
  } catch (error) {
    console.log("Index may already exist on transactions: bookingId");
  }

  // 4. Disputes collection indexes
  try {
    await db.collection("disputes").createIndex({ status: 1, createdAt: -1 });
    console.log("✓ Created index on disputes: status, createdAt");
  } catch (error) {
    console.log("Index may already exist on disputes: status, createdAt");
  }

  try {
    await db.collection("disputes").createIndex({ bookingId: 1 });
    console.log("✓ Created index on disputes: bookingId");
  } catch (error) {
    console.log("Index may already exist on disputes: bookingId");
  }

  try {
    await db.collection("disputes").createIndex({ clientId: 1 });
    console.log("✓ Created index on disputes: clientId");
  } catch (error) {
    console.log("Index may already exist on disputes: clientId");
  }

  try {
    await db.collection("disputes").createIndex({ providerId: 1 });
    console.log("✓ Created index on disputes: providerId");
  } catch (error) {
    console.log("Index may already exist on disputes: providerId");
  }

  try {
    await db.collection("disputes").createIndex({ reporterId: 1 });
    console.log("✓ Created index on disputes: reporterId");
  } catch (error) {
    console.log("Index may already exist on disputes: reporterId");
  }

  // 5. Services collection indexes
  try {
    await db.collection("services").createIndex({ category: 1 });
    console.log("✓ Created index on services: category");
  } catch (error) {
    console.log("Index may already exist on services: category");
  }

  try {
    await db.collection("services").createIndex({ providerId: 1 });
    console.log("✓ Created index on services: providerId");
  } catch (error) {
    console.log("Index may already exist on services: providerId");
  }

  // 6. Contact Messages collection indexes
  try {
    await db.collection("contactmessages").createIndex({ createdAt: -1 });
    console.log("✓ Created index on contactmessages: createdAt");
  } catch (error) {
    console.log("Index may already exist on contactmessages: createdAt");
  }

  try {
    await db.collection("contactmessages").createIndex({ email: 1 });
    console.log("✓ Created index on contactmessages: email");
  } catch (error) {
    console.log("Index may already exist on contactmessages: email");
  }

  try {
    await db.collection("contactmessages").createIndex({ status: 1 });
    console.log("✓ Created index on contactmessages: status");
  } catch (error) {
    console.log("Index may already exist on contactmessages: status");
  }

  // 7. Notifications collection indexes
  try {
    await db.collection("notifications").createIndex({ user: 1, createdAt: -1 });
    console.log("✓ Created index on notifications: user, createdAt");
  } catch (error) {
    console.log("Index may already exist on notifications: user, createdAt");
  }

  try {
    await db.collection("notifications").createIndex({ type: 1 });
    console.log("✓ Created index on notifications: type");
  } catch (error) {
    console.log("Index may already exist on notifications: type");
  }

  console.log("\n✅ Database indexes created successfully!");
  console.log("Note: Index creation may take some time for large collections.");
};

const main = async () => {
  await connectDB();
  await createIndexes();
  await mongoose.connection.close();
  console.log("Database connection closed");
  process.exit(0);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

module.exports = createIndexes;