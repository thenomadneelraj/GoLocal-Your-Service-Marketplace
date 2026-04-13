const User = require("../models/User");
const { APPROVAL_STATUS } = require("../utils/accountState");
const { getPrimaryAdmin } = require("./platformSettingsService");

const backfillClientApprovalStatus = async () => {
  const admin = await getPrimaryAdmin();
  if (!admin) {
    return false;
  }

  if (admin.platformSettings?.clientApprovalBackfilledAt) {
    return false;
  }

  await User.updateMany(
    { role: { $in: ["client", "CLIENT"] } },
    { $set: { approvalStatus: APPROVAL_STATUS.PENDING } }
  );

  admin.platformSettings = {
    ...(admin.platformSettings?.toObject
      ? admin.platformSettings.toObject()
      : admin.platformSettings || {}),
    clientApprovalBackfilledAt: new Date(),
  };

  await admin.save();

  return true;
};

module.exports = {
  backfillClientApprovalStatus,
};
