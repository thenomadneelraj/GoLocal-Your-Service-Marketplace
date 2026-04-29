/**
 * Mock API Layer
 * Simulates real backend API calls with artificial delays
 * Works alongside real backend when available
 */

import mockDB from "./db.js";
import { autoSeed } from "./seed.js";

// Configuration
const MOCK_DELAY = { min: 300, max: 800 };
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK_API === "true" ||
  !(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

// Utility functions
function randomDelay() {
  const delay =
    Math.random() * (MOCK_DELAY.max - MOCK_DELAY.min) + MOCK_DELAY.min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function createApiResponse(data, status = 200) {
  return Promise.resolve({
    status,
    data,
    headers: new Headers(),
    json: () => Promise.resolve(data),
  });
}

function createErrorResponse(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { message } };
  return Promise.reject(error);
}

// Mock API functions
export const mockApi = {
  // Authentication
  async signIn(credentials) {
    await randomDelay();
    autoSeed(); // Ensure data exists

    console.log("🔐 Mock SignIn attempt:", credentials);

    const { email, password, role } = credentials;

    // Admin authentication should never use mock data - always use real backend
    if (role?.toLowerCase() === "admin" || role === "ADMIN") {
      console.log(
        "� Admin authentication - must use real backend, no mock fallback",
      );
      return createErrorResponse(
        "Admin authentication requires real backend",
        401,
      );
    }

    // Check other users in database
    const user = mockDB.findOne("users", { email });

    console.log("🔍 Found user:", user);
    console.log("📊 All users:", mockDB.getUsers().slice(0, 3)); // Show first 3 users

    if (!user) {
      console.log("❌ User not found for email:", email);
      return createErrorResponse("User not found", 401);
    }

    // Check role compatibility (convert case-insensitive)
    const userRole = user.role?.toLowerCase();
    const requestedRole = role?.toLowerCase();

    if (userRole !== requestedRole) {
      console.log("❌ Role mismatch:", { userRole, requestedRole });
      return createErrorResponse(
        `User role (${userRole}) does not match selected role (${requestedRole})`,
        401,
      );
    }

    // For non-admin users, accept any non-empty password for mock
    if (!password || password.length === 0) {
      console.log("❌ Empty password");
      return createErrorResponse("Invalid password", 401);
    }

    const token = `mock-token-${user._id}-${Date.now()}`;

    console.log("✅ Login successful for:", user.name);

    return createApiResponse({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        approvalStatus: user.approvalStatus,
        isVerified: user.isVerified,
      },
    });
  },

  async signUp(userData) {
    await randomDelay();

    const existingUser = mockDB.findOne("users", { email: userData.email });
    if (existingUser) {
      return createErrorResponse("Email already exists", 409);
    }

    const newUser = mockDB.insert("users", {
      ...userData,
      approvalStatus: userData.role === "provider" ? "pending" : "approved",
      isVerified: false,
      isActive: true,
    });

    const token = `mock-token-${newUser._id}-${Date.now()}`;

    return createApiResponse({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        approvalStatus: newUser.approvalStatus,
        isVerified: newUser.isVerified,
      },
    });
  },

  // Providers
  async getProviders() {
    await randomDelay();

    const providers = mockDB.getProviders().map((provider) => ({
      _id: provider._id,
      name: provider.name,
      email: provider.email,
      serviceType: provider.serviceType,
      rating: provider.rating,
      totalReviews: provider.totalReviews,
      experience: provider.experience,
      hourlyRate: provider.hourlyRate,
      location: provider.location,
      bio: provider.bio,
      avatar: provider.avatar,
      approvalStatus: provider.approvalStatus,
      isVerified: provider.isVerified,
      isActive: provider.isActive,
      serviceCount: mockDB.getServicesByProvider(provider._id).length,
    }));

    return createApiResponse(providers);
  },

  async getProviderDetails(providerId) {
    await randomDelay();

    const details = mockDB.getProviderDetails(providerId);
    if (!details) {
      return createErrorResponse("Provider not found", 404);
    }

    return createApiResponse({
      _id: details.provider._id,
      name: details.provider.name,
      email: details.provider.email,
      serviceType: details.provider.serviceType,
      rating: details.provider.rating,
      totalReviews: details.provider.totalReviews,
      experience: details.provider.experience,
      hourlyRate: details.provider.hourlyRate,
      location: details.provider.location,
      bio: details.provider.bio,
      avatar: details.provider.avatar,
      approvalStatus: details.provider.approvalStatus,
      isVerified: details.provider.isVerified,
      isActive: details.provider.isActive,
      services: details.services,
      stats: details.stats,
      recentBookings: details.bookings.slice(0, 5),
    });
  },

  // Services
  async getServicesByProvider(providerId) {
    await randomDelay();

    const services = mockDB.getServicesByProvider(providerId);
    return createApiResponse(services);
  },

  // Bookings
  async createBooking(bookingData) {
    await randomDelay();

    // Validate service exists
    const service = mockDB.findOne("services", { _id: bookingData.serviceId });
    if (!service) {
      return createErrorResponse("Service not found", 404);
    }

    // Validate provider exists and is approved
    const provider = mockDB.findOne("users", {
      _id: service.providerId,
      role: "provider",
      approvalStatus: "approved",
    });
    if (!provider) {
      return createErrorResponse("Provider not available", 404);
    }

    const booking = mockDB.insert("bookings", {
      clientId: bookingData.clientId,
      providerId: service.providerId,
      serviceId: bookingData.serviceId,
      status: "pending",
      price: service.price,
      notes: bookingData.notes || "",
      scheduledDate: bookingData.scheduledDate,
    });

    return createApiResponse(booking);
  },

  async getBookingsByClient(clientId) {
    await randomDelay();

    const bookings = mockDB.getBookingsByClient(clientId).map((booking) => {
      const details = mockDB.getBookingDetails(booking._id);
      return {
        ...booking,
        provider: details.provider,
        service: details.service,
        hasDispute: !!details.dispute,
        messageCount: details.messages.length,
      };
    });

    return createApiResponse(bookings);
  },

  async getBookingsByProvider(providerId) {
    await randomDelay();

    const bookings = mockDB.getBookingsByProvider(providerId).map((booking) => {
      const details = mockDB.getBookingDetails(booking._id);
      return {
        ...booking,
        client: details.client,
        service: details.service,
        hasDispute: !!details.dispute,
        messageCount: details.messages.length,
      };
    });

    return createApiResponse(bookings);
  },

  async updateBookingStatus(bookingId, status) {
    await randomDelay();

    const booking = mockDB.update("bookings", { _id: bookingId }, { status });
    if (!booking) {
      return createErrorResponse("Booking not found", 404);
    }

    return createApiResponse(booking);
  },

  // Messages
  async getMessages(bookingId) {
    await randomDelay();

    const messages = mockDB.getMessages(bookingId);
    return createApiResponse(messages);
  },

  async sendMessage(messageData) {
    await randomDelay();

    // Validate booking exists
    const booking = mockDB.findOne("bookings", { _id: messageData.bookingId });
    if (!booking) {
      return createErrorResponse("Booking not found", 404);
    }

    // Validate sender is part of the booking
    if (
      messageData.senderId !== booking.clientId &&
      messageData.senderId !== booking.providerId
    ) {
      return createErrorResponse("Unauthorized", 403);
    }

    const message = mockDB.insert("messages", {
      bookingId: messageData.bookingId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      text: messageData.text,
      read: false,
    });

    return createApiResponse(message);
  },

  async markMessagesAsRead(bookingId, userId) {
    await randomDelay();

    const messages = mockDB.find("messages", { bookingId });
    messages.forEach((message) => {
      if (message.senderId !== userId) {
        mockDB.update("messages", { _id: message._id }, { read: true });
      }
    });

    return createApiResponse({ success: true });
  },

  // Disputes
  async createDispute(disputeData) {
    await randomDelay();

    // Validate booking exists
    const booking = mockDB.findOne("bookings", { _id: disputeData.bookingId });
    if (!booking) {
      return createErrorResponse("Booking not found", 404);
    }

    // Check if dispute already exists
    const existingDispute = mockDB.findOne("disputes", {
      bookingId: disputeData.bookingId,
    });
    if (existingDispute) {
      return createErrorResponse(
        "Dispute already exists for this booking",
        409,
      );
    }

    const dispute = mockDB.insert("disputes", {
      bookingId: disputeData.bookingId,
      raisedBy: disputeData.raisedBy,
      reason: disputeData.reason,
      description: disputeData.description,
      status: "open",
    });

    return createApiResponse(dispute);
  },

  async getDisputesByUser(userId) {
    await randomDelay();

    const disputes = mockDB.getDisputesByUser(userId).map((dispute) => {
      const details = mockDB.getBookingDetails(dispute.bookingId);
      return {
        ...dispute,
        booking: details.booking,
        client: details.client,
        provider: details.provider,
        service: details.service,
      };
    });

    return createApiResponse(disputes);
  },

  async updateDisputeStatus(disputeId, status) {
    await randomDelay();

    const dispute = mockDB.update("disputes", { _id: disputeId }, { status });
    if (!dispute) {
      return createErrorResponse("Dispute not found", 404);
    }

    return createApiResponse(dispute);
  },

  // User profile
  async getUserProfile(userId) {
    await randomDelay();

    const user = mockDB.findOne("users", { _id: userId });
    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    return createApiResponse({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      approvalStatus: user.approvalStatus,
      isVerified: user.isVerified,
      isActive: user.isActive,
      ...(user.role === "provider" && {
        serviceType: user.serviceType,
        bio: user.bio,
        rating: user.rating,
        totalReviews: user.totalReviews,
        experience: user.experience,
        hourlyRate: user.hourlyRate,
        skills: user.skills,
      }),
    });
  },

  async updateUserProfile(userId, updates) {
    await randomDelay();

    const user = mockDB.update("users", { _id: userId }, updates);
    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    return createApiResponse(user);
  },
};

// Export a function to determine if mock should be used
export function shouldUseMock() {
  // If specifically set to use mock, or if backend is likely unavailable
  return (
    USE_MOCK ||
    !(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)
  );
}

export default mockApi;
