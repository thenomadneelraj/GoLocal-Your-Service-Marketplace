const User = require("../models/User");
const Admin = require("../models/Admin");

const ensureSingleAdmin = async () => {
  const legacyUserAdmins = await User.countDocuments({ role: "ADMIN" });
  if (legacyUserAdmins > 0) {
    await User.deleteMany({ role: "ADMIN" });
    console.warn(
      `Removed ${legacyUserAdmins} legacy ADMIN record(s) from User collection.`
    );
  }

  const adminCount = await Admin.countDocuments();

  if (adminCount > 1) {
    throw new Error(
      "Invalid admin state: multiple ADMIN users exist. Keep only one ADMIN account."
    );
  }

  if (adminCount === 0) {
    console.warn(
      "No ADMIN account found in admins collection. Create one manually in MongoDB."
    );
  }
};

module.exports = {
  ensureSingleAdmin,
};
