import axios from "axios";
import mockApi, { shouldUseMock } from "../mock/mockApi.js";
import mockDB from "../mock/db.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

api.interceptors.request.use((config) => {
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

  // Wrapper methods that choose between real and mock API
  async get(url, config) {
    if (this.useMock) {
      return this.handleMockRequest("GET", url, null, config);
    }
    return api.get(url, config);
  },

  async post(url, data, config) {
    if (this.useMock) {
      return this.handleMockRequest("POST", url, data, config);
    }
    return api.post(url, data, config);
  },

  async put(url, data, config) {
    if (this.useMock) {
      return this.handleMockRequest("PUT", url, data, config);
    }
    return api.put(url, data, config);
  },

  async delete(url, config) {
    if (this.useMock) {
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
      const id = urlParts[1];

      switch (method) {
        case "GET":
          return this.handleMockGet(endpoint, id, urlParts);
        case "POST":
          return this.handleMockPost(endpoint, data);
        case "PUT":
          return this.handleMockPut(endpoint, id, data);
        case "DELETE":
          return this.handleMockDelete(endpoint, id);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      console.error("Mock API Error:", error);
      throw error;
    }
  },

  // Mock GET handlers
  async handleMockGet(endpoint, id, urlParts) {
    switch (endpoint) {
      case "providers":
        if (id) {
          return await mockApi.getProviderDetails(id);
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
        if (id) {
          // Get specific booking details
          const booking = mockDB.findOne("bookings", { _id: id });
          if (!booking) throw new Error("Booking not found");
          return { data: mockDB.getBookingDetails(id) };
        }
        break;

      case "messages":
        if (urlParts[1]) {
          return await mockApi.getMessages(urlParts[1]);
        }
        break;

      case "disputes":
        if (urlParts[1] === "user" && urlParts[2]) {
          return await mockApi.getDisputesByUser(urlParts[2]);
        }
        break;

      case "auth":
        if (urlParts[1] === "profile") {
          const token = sessionStorage.getItem("token");
          if (!token) throw new Error("No token found");
          const userId = token.split("-")[1];
          return await mockApi.getUserProfile(userId);
        }
        break;

      default:
        throw new Error(`Unknown GET endpoint: ${endpoint}`);
    }
    throw new Error(`Invalid GET request: ${endpoint}`);
  },

  // Mock POST handlers
  async handleMockPost(endpoint, data) {
    switch (endpoint) {
      case "auth":
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
  async handleMockPut(endpoint, id, data) {
    switch (endpoint) {
      case "bookings":
        if (urlParts[2] === "status") {
          return await mockApi.updateBookingStatus(id, data.status);
        }
        break;

      case "disputes":
        if (urlParts[2] === "status") {
          return await mockApi.updateDisputeStatus(id, data.status);
        }
        break;

      case "auth":
        if (urlParts[1] === "profile") {
          const token = sessionStorage.getItem("token");
          if (!token) throw new Error("No token found");
          const userId = token.split("-")[1];
          return await mockApi.updateUserProfile(userId, data);
        }
        break;

      case "messages":
        if (urlParts[2] === "read") {
          return await mockApi.markMessagesAsRead(id, data.userId);
        }
        break;

      default:
        throw new Error(`Unknown PUT endpoint: ${endpoint}`);
    }
    throw new Error(`Invalid PUT request: ${endpoint}`);
  },

  // Mock DELETE handlers
  async handleMockDelete(endpoint, id) {
    // Add delete handlers as needed
    throw new Error(`DELETE not implemented for ${endpoint}`);
  },
};

export default apiWrapper;
