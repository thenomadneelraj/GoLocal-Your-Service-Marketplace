/**
 * Seed script to ensure the admin account exists in the database.
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD from the server .env file.
 *
 * Usage:  node seedAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@golocal.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminPass123";

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      console.log(`Admin account already exists: ${ADMIN_EMAIL} (role: ${existing.role})`);

      if (existing.role !== "admin") {
        console.log(`  ⚠  Account exists but role is "${existing.role}", updating to "admin"...`);
        existing.role = "admin";
        existing.password = ADMIN_PASSWORD; // re-hash via pre-save hook
        await existing.save();
        console.log("  ✔  Role updated to admin and password reset.");
      } else {
        // Reset password in case it was corrupted
        console.log("  Resetting admin password...");
        existing.password = ADMIN_PASSWORD;
        await existing.save();
        console.log("  ✔  Admin password has been reset.");
      }
    } else {
      await User.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
        name: "Admin",
        phone: "0000000000",
        status: "active",
        approvalStatus: "approved",
        isActive: true,
      });
      console.log(`✔  Admin account created: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error("Seed failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seedAdmin();
