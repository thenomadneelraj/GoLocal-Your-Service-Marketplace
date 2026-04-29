const mongoose = require("mongoose");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Message = require("../models/Message");
const Dispute = require("../models/Dispute");
const Transaction = require("../models/Transaction");

const FIRST_NAMES = [
  "John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa",
  "James", "Mary", "William", "Patricia", "Richard", "Jennifer", "Charles",
  "Linda", "Joseph", "Barbara", "Thomas", "Susan",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
];

const CITIES = [
  "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
  "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
  "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte",
];

const STATES = ["NY", "CA", "IL", "TX", "AZ", "PA", "FL", "OH", "NC", "GA"];

const SERVICE_TYPES = [
  "Plumbing", "Electrical", "Carpentry", "Painting", "Cleaning",
  "Landscaping", "HVAC", "Roofing", "Moving", "Appliance Repair",
  "Pest Control", "Home Security", "Flooring", "Window Installation",
  "Insulation", "Concrete", "Pool Maintenance", "Tree Service",
];

const SERVICE_DESCRIPTIONS = [
  "Professional and reliable service with years of experience",
  "High-quality workmanship guaranteed, licensed and insured",
  "Fast response time, competitive pricing",
  "Expert solutions for all your needs",
  "Trusted local provider with excellent reviews",
  "Specializing in residential and commercial projects",
  "Eco-friendly and sustainable solutions available",
  "Emergency services available 24/7",
];

const BOOKING_STATUSES = ["pending", "accepted", "completed", "cancelled"];
const DISPUTE_REASONS = [
  "Poor quality",
  "Late arrival",
  "Damage to property",
  "Incomplete work",
  "Billing issue",
  "Unprofessional behavior",
];
const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
];
const MOCK_PROVIDER_COUNT = 5;
const MOCK_CLIENT_COUNT = 5;

const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];
const randomNumber = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const mockEmail = (role, index) => `mock.${role}.${index + 1}@golocal.test.com`;

const randomPhone = (index, prefix = 700) =>
  `${prefix}${String(index + 1).padStart(7, "0")}`;

const randomAddress = () => {
  const streetNumber = randomNumber(100, 9999);
  const streetNames = [
    "Main St",
    "Oak Ave",
    "Elm St",
    "Pine St",
    "Maple Ave",
    "Cedar St",
    "Washington St",
    "Park Ave",
    "Lincoln St",
    "Union St",
  ];

  return `${streetNumber} ${randomChoice(streetNames)}, ${randomChoice(CITIES)}, ${randomChoice(STATES)}`;
};

const randomBio = (profession) => {
  const bios = [
    `Experienced ${profession} with over ${randomNumber(3, 15)} years in the industry`,
    `Certified ${profession} specializing in residential and commercial projects`,
    `Professional ${profession} committed to quality and customer satisfaction`,
    `Reliable ${profession} with excellent track record and positive reviews`,
    `Skilled ${profession} offering competitive rates and flexible scheduling`,
  ];

  return randomChoice(bios);
};

function generateUsers() {
  const users = [];

  for (let index = 0; index < MOCK_PROVIDER_COUNT; index += 1) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const serviceType = randomChoice(SERVICE_TYPES);

    users.push({
      name: `${firstName} ${lastName}`,
      email: mockEmail("provider", index),
      role: "provider",
      phone: randomPhone(index, 800),
      address: randomAddress(),
      serviceType,
      bio: randomBio(serviceType),
      rating: Number((Math.random() * 2 + 3).toFixed(1)),
      totalReviews: randomNumber(0, 50),
      experience: randomNumber(1, 20),
      hourlyRate: randomNumber(25, 150),
      approvalStatus: randomChoice(["approved", "pending", "rejected"]),
      isVerified: Math.random() > 0.3,
      status: Math.random() > 0.1 ? "active" : "disabled",
      workCategories: [serviceType, randomChoice(SERVICE_TYPES)],
      works: [
        {
          title: serviceType,
          price: randomNumber(50, 500),
        },
      ],
      password: "MockPass123!",
      profileImage: "",
      location: "",
      isMock: true,
    });
  }

  for (let index = 0; index < MOCK_CLIENT_COUNT; index += 1) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);

    users.push({
      name: `${firstName} ${lastName}`,
      email: mockEmail("client", index),
      role: "client",
      phone: randomPhone(index, 900),
      address: randomAddress(),
      isVerified: Math.random() > 0.5,
      status: "active",
      password: "MockPass123!",
      profileImage: "",
      isMock: true,
    });
  }

  return users;
}

function generateServices(providers) {
  const services = [];

  providers.forEach((provider) => {
    const count = randomNumber(1, 4);

    for (let index = 0; index < count; index += 1) {
      services.push({
        providerId: provider._id,
        title: `${provider.serviceType} Service ${index + 1}`,
        description: randomChoice(SERVICE_DESCRIPTIONS),
        price: randomNumber(50, 500),
        duration: `${randomNumber(1, 8)} hours`,
        category: provider.serviceType,
        status: Math.random() > 0.1 ? "active" : "inactive",
        locationType: "offline",
        rating: Number((Math.random() * 2 + 3).toFixed(1)),
        totalBookings: randomNumber(0, 25),
      });
    }
  });

  return services;
}

function generateBookings(clients, providers, services) {
  const bookings = [];
  const approvedProviders = providers.filter(
    (provider) => provider.approvalStatus === "approved" && provider.status === "active",
  );

  clients.forEach((client) => {
    const count = randomNumber(1, 5);

    for (let index = 0; index < count; index += 1) {
      if (!approvedProviders.length) continue;

      const provider = randomChoice(approvedProviders);
      const availableServices = services.filter(
        (service) =>
          service.providerId.toString() === provider._id.toString() &&
          service.status === "active",
      );

      if (!availableServices.length) continue;

      const service = randomChoice(availableServices);
      const createdAt = new Date(
        Date.now() - randomNumber(1, 90) * 24 * 60 * 60 * 1000,
      );
      const bookingDate = new Date(
        createdAt.getTime() + randomNumber(1, 30) * 24 * 60 * 60 * 1000,
      );
      const timeSlot = randomChoice(TIME_SLOTS);

      bookings.push({
        clientId: client._id,
        providerId: provider._id,
        serviceId: service._id,
        selectedServices: [
          {
            serviceId: service._id,
            title: service.title,
            category: service.category,
            price: service.price,
            duration: service.duration,
            locationType: service.locationType,
          },
        ],
        services: [
          {
            title: service.title,
            price: service.price,
          },
        ],
        totalAmount: service.price,
        bookingDate,
        date: bookingDate,
        timeSlot,
        time: timeSlot,
        notes: `Booking request for ${service.title}`,
        requirements: `Please bring the required tools for ${service.category}.`,
        address: client.address || randomAddress(),
        price: service.price,
        status: randomChoice(BOOKING_STATUSES),
        paymentStatus: Math.random() > 0.45 ? "paid" : "pending",
        paymentMethod: "upi",
        createdAt,
        updatedAt: createdAt,
      });
    }
  });

  return bookings;
}

function generateMessages(bookings, users) {
  const messages = [];
  const clientMessages = [
    "Hi, I need this service as soon as possible",
    "Are you available this weekend?",
    "What is your availability for next week?",
    "Can you provide a quote for this service?",
    "I have a few questions about the service",
    "Thank you for your quick response",
    "Looking forward to working with you",
    "Is there anything I need to prepare before the service?",
  ];
  const providerMessages = [
    "Hello, I would be happy to help you with this service",
    "Yes, I am available this weekend",
    "I can schedule you for next week",
    "My rates are competitive and flexible",
    "I have over 10 years of experience in this field",
    "Thank you for choosing my service",
    "I will bring all necessary equipment",
    "The service usually takes about 2-3 hours",
  ];

  bookings.forEach((booking) => {
    const count = randomNumber(3, 10);

    for (let index = 0; index < count; index += 1) {
      const senderId = randomChoice([booking.clientId, booking.providerId]);
      const sender = users.find(
        (user) => user._id.toString() === senderId.toString(),
      );

      if (!sender) continue;

      const isClient = sender.role === "client";
      const createdAt = new Date(
        new Date(booking.createdAt).getTime() +
          index * randomNumber(1, 24) * 60 * 60 * 1000,
      );

      messages.push({
        bookingId: booking._id,
        sender: sender._id,
        receiver: isClient ? booking.providerId : booking.clientId,
        content: isClient
          ? randomChoice(clientMessages)
          : randomChoice(providerMessages),
        createdAt,
        updatedAt: createdAt,
        read: Math.random() > 0.3,
      });
    }
  });

  return messages;
}

function generateDisputes(bookings) {
  return bookings
    .filter(() => Math.random() < 0.2)
    .map((booking) => {
      const createdAt = new Date(
        new Date(booking.createdAt).getTime() +
          randomNumber(1, 7) * 24 * 60 * 60 * 1000,
      );

      return {
        bookingId: booking._id,
        reporterId: booking.clientId,
        clientId: booking.clientId,
        providerId: booking.providerId,
        targetUserId: booking.providerId,
        targetType: "provider",
        threadKey: `mock-dispute:${booking._id}`,
        subject: "Service quality concern",
        reason: randomChoice(DISPUTE_REASONS),
        description: "Issue with booking",
        status: randomChoice(["open", "resolved", "under_review"]),
        createdAt,
        updatedAt: createdAt,
      };
    });
}

function generateTransactions(bookings) {
  return bookings
    .filter((booking) => booking.paymentStatus === "paid")
    .map((booking, index) => {
      const baseAmount = Number(booking.totalAmount || booking.price || 0);
      const clientFee = Number((baseAmount * 0.05).toFixed(2));
      const providerFee = Number((baseAmount * 0.05).toFixed(2));
      const totalPaid = baseAmount + clientFee;
      const providerEarn = baseAmount - providerFee;

      return {
        bookingId: booking._id,
        clientId: booking.clientId,
        providerId: booking.providerId,
        amount: totalPaid,
        baseAmount,
        clientPlatformFee: clientFee,
        clientFee,
        providerPlatformFee: providerFee,
        providerFee,
        totalPaidByClient: totalPaid,
        totalPaid,
        netToProvider: providerEarn,
        providerEarn,
        platformRevenue: clientFee + providerFee,
        commissionPercentage: 5,
        currency: "INR",
        paymentMethod: booking.paymentMethod || "upi",
        transactionId: `MOCK-TX-${String(index + 1).padStart(4, "0")}`,
        status: "paid",
        serviceSnapshot: {
          services: booking.selectedServices,
        },
      };
    });
}

async function clearExistingMockData() {
  const existingMockUsers = await User.find({
    $or: [{ isMock: true }, { email: /^mock\./ }],
  }).select("_id");
  const existingMockUserIds = existingMockUsers.map((user) => user._id);

  if (!existingMockUserIds.length) {
    return;
  }

  const existingMockBookings = await Booking.find({
    $or: [
      { clientId: { $in: existingMockUserIds } },
      { providerId: { $in: existingMockUserIds } },
    ],
  }).select("_id");
  const existingMockBookingIds = existingMockBookings.map((booking) => booking._id);

  await Message.deleteMany({
    $or: [
      { bookingId: { $in: existingMockBookingIds } },
      { sender: { $in: existingMockUserIds } },
      { receiver: { $in: existingMockUserIds } },
    ],
  });
    await Dispute.deleteMany({
    $or: [
      { bookingId: { $in: existingMockBookingIds } },
      { reporterId: { $in: existingMockUserIds } },
      { clientId: { $in: existingMockUserIds } },
      { providerId: { $in: existingMockUserIds } },
      { targetUserId: { $in: existingMockUserIds } },
    ],
    });
    await Transaction.deleteMany({
      $or: [
        { bookingId: { $in: existingMockBookingIds } },
        { clientId: { $in: existingMockUserIds } },
        { providerId: { $in: existingMockUserIds } },
      ],
    });
    await Booking.deleteMany({ _id: { $in: existingMockBookingIds } });
  await Service.deleteMany({ providerId: { $in: existingMockUserIds } });
  await User.deleteMany({ _id: { $in: existingMockUserIds } });
}

async function seedMockData() {
  console.log("Starting mock data seeding...");

  await clearExistingMockData();
  console.log("Cleared existing mock data.");

  const savedUsers = await User.insertMany(generateUsers(), { ordered: true });
  const providers = savedUsers.filter((user) => user.role === "provider");
  const clients = savedUsers.filter((user) => user.role === "client");
  console.log(`Inserted ${savedUsers.length} mock users.`);

  const savedServices = await Service.insertMany(generateServices(providers), {
    ordered: true,
  });
  console.log(`Inserted ${savedServices.length} mock services.`);

  const savedBookings = await Booking.insertMany(
    generateBookings(clients, providers, savedServices),
    { ordered: true },
  );
  console.log(`Inserted ${savedBookings.length} mock bookings.`);

  const savedMessages = await Message.insertMany(
    generateMessages(savedBookings, savedUsers),
    { ordered: true },
  );
  console.log(`Inserted ${savedMessages.length} mock messages.`);

  const savedDisputes = await Dispute.insertMany(generateDisputes(savedBookings), {
    ordered: true,
  });
  console.log(`Inserted ${savedDisputes.length} mock disputes.`);

  const savedTransactions = await Transaction.insertMany(
    generateTransactions(savedBookings),
    { ordered: true },
  );
  console.log(`Inserted ${savedTransactions.length} mock transactions.`);

  console.log("Mock data seeding completed.");
  return {
    users: savedUsers.length,
    services: savedServices.length,
    bookings: savedBookings.length,
    messages: savedMessages.length,
    disputes: savedDisputes.length,
    transactions: savedTransactions.length,
  };
}

module.exports = seedMockData;

if (require.main === module) {
  require("dotenv").config();
  const connectDB = require("../config/db");

  connectDB()
    .then(() => seedMockData())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Mock data seeding failed:", error);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}
