const User = require("../models/User");

const ensureSingleAdmin = async () => {
  const legacyUserAdmins = await User.countDocuments({ role: "ADMIN" });
  if (legacyUserAdmins > 0) {
    await User.deleteMany({ role: "ADMIN" });
    console.warn(
      `Removed ${legacyUserAdmins} legacy ADMIN record(s) from User collection.`
    );
  }

  const adminCount = await User.countDocuments({ role: 'admin' });

  if (adminCount > 1) {
    throw new Error(
      "Invalid admin state: multiple admin users exist. Keep only one admin account."
    );
  }

  if (adminCount === 0) {
    const adminEmail = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();

    if (adminEmail && adminPassword) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        name: "GoLocal Admin",
        status: "active",
        approvalStatus: "approved",
        isVerified: true,
      });

      console.warn(`Created admin account from environment for ${adminEmail}.`);
      return;
    }

    console.warn(
      "No admin account found in User collection. Set ADMIN_EMAIL and ADMIN_PASSWORD or create one manually in MongoDB."
    );
  }
};

module.exports = {
  ensureSingleAdmin,
};
