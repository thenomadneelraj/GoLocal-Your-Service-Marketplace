const mongoose = require("mongoose");
require("dotenv").config();

// Old models
const User = require("./User");
const Admin = require("./Admin");
const Client = require("./Client");
const Provider = require("./Provider");

// New models
const UserNew = require("./UserNew");

const migrateUsers = async () => {
  console.log("🔄 Starting user migration...");
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Get all existing data
    const admins = await Admin.find({});
    const clients = await Client.find({});
    const providers = await Provider.find({});

    console.log(`📊 Found ${admins.length} admins, ${clients.length} clients, ${providers.length} providers`);

    // Clear new users collection
    await UserNew.deleteMany({});
    console.log("🗑️ Cleared new users collection");

    // Migrate admins
    const adminUsers = admins.map(admin => ({
      name: admin.name,
      email: admin.email,
      password: admin.password, // Will be hashed by pre-save hook
      role: "admin",
      status: admin.status || "active",
      profileImage: admin.profileImage || admin.profilePhoto || "",
      phone: admin.phone,
      address: admin.address,
      totalLogins: admin.totalLogins || 0,
      lastLogin: admin.lastLogin,
    }));

    // Migrate clients
    const clientUsers = clients.map(client => ({
      name: client.name,
      email: client.email,
      password: client.password,
      role: "client",
      status: client.status || "active",
      profileImage: client.profileImage || client.profilePhoto || "",
      phone: client.phone,
      address: client.address,
      totalLogins: client.totalLogins || 0,
      lastLogin: client.lastLogin,
    }));

    // Migrate providers
    const providerUsers = providers.map(provider => ({
      name: provider.name,
      email: provider.email,
      password: provider.password,
      role: "provider",
      status: provider.status || "active",
      approvalStatus: provider.isApproved ? "approved" : "pending",
      profileImage: provider.profileImage || provider.profilePhoto || "",
      phone: provider.phone,
      address: provider.address,
      totalLogins: provider.totalLogins || 0,
      lastLogin: provider.lastLogin,
    }));

    // Insert all users
    const allUsers = [...adminUsers, ...clientUsers, ...providerUsers];
    await UserNew.insertMany(allUsers);

    console.log(`✅ Successfully migrated ${allUsers.length} users to new unified collection`);
    
    // Verification
    const adminCount = await UserNew.countDocuments({ role: "admin" });
    const clientCount = await UserNew.countDocuments({ role: "client" });
    const providerCount = await UserNew.countDocuments({ role: "provider" });
    
    console.log(`📈 New counts: ${adminCount} admins, ${clientCount} clients, ${providerCount} providers`);
    
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
};

// Run migration
if (require.main === module) {
  migrateUsers();
}

module.exports = { migrateUsers };
