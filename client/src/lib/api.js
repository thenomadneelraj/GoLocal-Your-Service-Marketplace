import axios from "axios";
import mockApi, { shouldUseMock } from "../mock/mockApi.js";
import mockDB from "../mock/db.js";

const normalizeApiUrl = (url = "") => {
  return String(url)
    .replace(/^\/?api(\/|$)/i, "/")
    .replace(/\/\/{2,}/g, "/");
};

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ""
).replace(/\/$/, "");

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeApiUrl(config.url);
  }

  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers) {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.code === "ACCOUNT_RESTRICTED"
    ) {
      window.dispatchEvent(new Event("account-access-updated"));
    }
    if (error?.response?.status === 401) {
      sessionStorage.removeItem("token");
      if (!window.location.pathname.startsWith("/signin")) {
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  },
);

// Enhanced API wrapper that supports mock mode
const apiWrapper = {
  // Determine if we should use mock API
  useMock: shouldUseMock(),

  // Original axios instance for real API calls
  axios: api,

  // Helper method to detect admin requests
  isAdminRequest(url, data = null) {
    // Check URL for admin endpoints
    if (url.includes("/admin/")) {
      console.log(" Admin request detected by URL:", url);
      return true;
    }

    // Check authentication data for admin role
    if (data && data.role) {
      const isAdmin =
        data.role.toLowerCase() === "admin" || data.role === "ADMIN";
      console.log(" Admin request detected by role:", {
        role: data.role,
        isAdmin,
      });
      return isAdmin;
    }

    // Platform status should always use real backend (admin-controlled)
    if (url.includes("/platform-status")) {
      return true;
    }

    return false;
  },

  // Wrapper methods that choose between real and mock API
  async get(url, config) {
    if (this.useMock && !this.isAdminRequest(url)) {
      return this.handleMockRequest("GET", url, null, config);
    }
    return api.get(url, config);
  },

  async post(url, data, config) {
    console.log(`📤 API POST: ${url}`, { data, useMock: this.useMock });
    const isAdminReq = this.isAdminRequest(url, data);
    console.log(`🔍 Is admin request: ${isAdminReq}`);

    if (this.useMock && !isAdminReq) {
      console.log(`🔧 Using mock API for: ${url}`);
      return this.handleMockRequest("POST", url, data, config);
    }

    if (isAdminReq && this.useMock) {
      console.log(`🌐 Admin request with mock mode - using real API only`);
      console.log(`🌐 Using real API for admin request: ${url}`);
      return await api.post(url, data, config);
    }

    console.log(`🌐 Using real API for: ${url}`);
    return api.post(url, data, config);
  },

  async put(url, data, config) {
    if (this.useMock && !this.isAdminRequest(url)) {
      return this.handleMockRequest("PUT", url, data, config);
    }
    return api.put(url, data, config);
  },

  async delete(url, config) {
    if (this.useMock && !this.isAdminRequest(url)) {
      return this.handleMockRequest("DELETE", url, null, config);
    }
    return api.delete(url, config);
  },

  // Handle mock API requests
  async handleMockRequest(method, url, data = null, config = null) {
    console.log(`🔧 Mock API: ${method} ${url}`);

    try {
      // Parse URL to determine endpoint
      const urlParts = url.split("/").filter((part) => part);
      const endpoint = urlParts[0];
      const subEndpoint = urlParts[1];
      const id = urlParts[2];

      switch (method) {
        case "GET":
          return this.handleMockGet(endpoint, subEndpoint, urlParts);
        case "POST":
          return this.handleMockPost(endpoint, subEndpoint, data);
        case "PUT":
          return this.handleMockPut(endpoint, subEndpoint, id, data);
        case "DELETE":
          return this.handleMockDelete(endpoint, subEndpoint);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      console.error("Mock API Error:", error);
      throw error;
    }
  },

  // Mock GET handlers
  async handleMockGet(endpoint, subEndpoint, urlParts) {
    switch (endpoint) {
      case "providers":
        if (subEndpoint) {
          return await mockApi.getProviderDetails(subEndpoint);
        }
        return await mockApi.getProviders();

      case "services":
        if (urlParts[1] === "provider" && urlParts[2]) {
          return await mockApi.getServicesByProvider(urlParts[2]);
        }
        break;

      case "bookings":
        if (urlParts[1] === "client" && urlParts[2]) {
          return await mockApi.getBookingsByClient(urlParts[2]);
        }
        if (urlParts[1] === "provider" && urlParts[2]) {
          return await mockApi.getBookingsByProvider(urlParts[2]);
        }
        if (subEndpoint) {
          // Get specific booking details
          const booking = mockDB.findOne("bookings", { _id: subEndpoint });
          if (!booking) throw new Error("Booking not found");
          return { data: mockDB.getBookingDetails(subEndpoint) };
        }
        break;

      case "messages":
        if (subEndpoint) {
          return await mockApi.getMessages(subEndpoint);
        }
        break;

      case "disputes":
        if (urlParts[1] === "user" && urlParts[2]) {
          return await mockApi.getDisputesByUser(urlParts[2]);
        }
        break;

      case "auth":
        if (subEndpoint === "profile") {
          const token = sessionStorage.getItem("token");
          if (!token) throw new Error("No token found");
          const userId = token.split("-")[1];
          return await mockApi.getUserProfile(userId);
        }
        break;

      case "notifications":
        return {
          data: {
            data: {
              items: [],
              unreadCount: 0,
              total: 0,
            },
          },
        };

      case "admin":
        // Admin should never use mock data - always use real backend
        throw new Error(
          "Admin endpoints require real backend - no mock data available",
        );

      default:
        throw new Error(`Unknown GET endpoint: ${endpoint}`);
    }
    throw new Error(`Invalid GET request: ${endpoint}`);
  },

  // Mock POST handlers
  async handleMockPost(endpoint, subEndpoint, data) {
    switch (endpoint) {
      case "auth":
        if (subEndpoint === "signIn" && data.email && data.password) {
          return await mockApi.signIn(data);
        }
        if (subEndpoint === "register") {
          return await mockApi.signUp(data);
        }
        // Handle direct auth POST for backward compatibility
        if (data.email && data.password) {
          return await mockApi.signIn(data);
        }
        return await mockApi.signUp(data);

      case "bookings":
        return await mockApi.createBooking(data);

      case "messages":
        return await mockApi.sendMessage(data);

      case "disputes":
        return await mockApi.createDispute(data);

      default:
        throw new Error(`Unknown POST endpoint: ${endpoint}`);
    }
  },

  // Mock PUT handlers
  async handleMockPut(endpoint, subEndpoint, id, data) {
    switch (endpoint) {
      case "bookings":
        if (subEndpoint === "status") {
          return await mockApi.updateBookingStatus(id, data.status);
        }
        break;

      case "disputes":
        if (subEndpoint === "status") {
          return await mockApi.updateDisputeStatus(id, data.status);
        }
        break;

      case "auth":
        if (subEndpoint === "profile") {
          const token = sessionStorage.getItem("token");
          if (!token) throw new Error("No token found");
          const userId = token.split("-")[1];
          return await mockApi.updateUserProfile(userId, data);
        }
        break;

      case "admin":
        return this.handleAdminPatch(subEndpoint, id, data);

      case "messages":
        if (subEndpoint === "read") {
          return await mockApi.markMessagesAsRead(id, data.userId);
        }
        break;

      default:
        throw new Error(`Unknown PUT endpoint: ${endpoint}`);
    }
    throw new Error(`Invalid PUT request: ${endpoint}`);
  },

  // Admin PATCH handlers
  async handleAdminPatch(subEndpoint, id, data) {
    console.log(`🔧 Mock Admin API: PATCH ${subEndpoint}/${id}`, data);

    switch (subEndpoint) {
      case "users":
        if (urlParts[2] === "status") {
          const updatedUser = mockDB.update("users", id, {
            approvalStatus: data.status,
            isActive: data.isActive !== undefined ? data.isActive : true,
          });
          return { data: { data: updatedUser } };
        }
        if (urlParts[2] === "verification") {
          const updatedUser = mockDB.update("users", id, {
            isVerified: data.isVerified,
            verificationDocuments: data.verificationDocuments,
          });
          return { data: { data: updatedUser } };
        }
        break;

      default:
        throw new Error(`Unknown admin PATCH endpoint: ${subEndpoint}`);
    }
  },

  // Mock DELETE handlers
  async handleMockDelete(endpoint, subEndpoint) {
    // Add delete handlers as needed
    throw new Error(`DELETE not implemented for ${endpoint}`);
  },
};

export default apiWrapper;
