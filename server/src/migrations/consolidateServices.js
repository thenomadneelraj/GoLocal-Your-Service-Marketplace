const mongoose = require("mongoose");
require("dotenv").config();

// Old models to migrate
const Booking = require("./Booking");
const Service = require("./Service");

// New models
const ServiceNew = require("./ServiceNew");
const BookingNew = require("./BookingNew");

const migrateServices = async () => {
  console.log("🔄 Starting service migration...");
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Get existing services
    const services = await Service.find({});
    console.log(`📊 Found ${services.length} services`);

    // Clear new services collection
    await ServiceNew.deleteMany({});
    console.log("🗑️ Cleared new services collection");

    // Migrate services (keeping existing structure)
    const migratedServices = services.map(service => ({
      providerId: service.providerId,
      name: service.name,
      price: service.price || 0,
      status: service.status || "active",
      description: service.description || "",
      category: service.category || "Other",
    }));

    // Insert all services
    await ServiceNew.insertMany(migratedServices);
    console.log(`✅ Successfully migrated ${migratedServices.length} services`);

    // Verification
    const serviceCount = await ServiceNew.countDocuments();
    console.log(`📈 New services count: ${serviceCount}`);
    
  } catch (error) {
    console.error("❌ Service migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
};

const migrateBookings = async () => {
  console.log("🔄 Starting booking migration...");
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Get existing bookings
    const bookings = await Booking.find({});
    console.log(`📊 Found ${bookings.length} bookings`);

    // Clear new bookings collection
    await BookingNew.deleteMany({});
    console.log("🗑️ Cleared new bookings collection");

    // Migrate bookings
    const migratedBookings = bookings.map(booking => ({
      clientId: booking.clientId,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      status: booking.status || "pending",
      date: booking.date || new Date(),
      address: booking.address || "",
      notes: booking.notes || "",
      price: booking.price || 0,
    }));

    // Insert all bookings
    await BookingNew.insertMany(migratedBookings);
    console.log(`✅ Successfully migrated ${migratedBookings.length} bookings`);

    // Verification
    const bookingCount = await BookingNew.countDocuments();
    console.log(`📈 New bookings count: ${bookingCount}`);
    
  } catch (error) {
    console.error("❌ Booking migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
};

// Run migrations
if (require.main === module) {
  await migrateServices();
  await migrateBookings();
}

module.exports = { migrateServices, migrateBookings };
