const { migrateUsers } = require("./consolidateUsers");
const { migrateServices, migrateBookings } = require("./consolidateServices");

const runMigrations = async () => {
  console.log("🚀 Starting database consolidation...");
  console.log("=" .repeat(50));
  
  try {
    // Step 1: Consolidate users
    console.log("📋 Step 1/6: Consolidating users...");
    await migrateUsers();
    
    console.log("=" .repeat(50));
    
    // Step 2: Consolidate services
    console.log("📋 Step 2/6: Consolidating services...");
    await migrateServices();
    
    console.log("=" .repeat(50));
    
    // Step 3: Consolidate bookings
    console.log("📋 Step 3/6: Consolidating bookings...");
    await migrateBookings();
    
    console.log("=" .repeat(50));
    
    console.log("✅ Database consolidation complete!");
    console.log("📊 New structure: 8 collections");
    console.log("   - users (all roles)");
    console.log("   - services");
    console.log("   - bookings");
    console.log("   - conversations");
    console.log("   - messages");
    console.log("   - transactions");
    console.log("   - disputes");
    console.log("   - notifications");
    
    console.log("\n🎯 Next steps:");
    console.log("1. Update controllers to use new models");
    console.log("2. Test all endpoints");
    console.log("3. Remove old collections when ready");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
