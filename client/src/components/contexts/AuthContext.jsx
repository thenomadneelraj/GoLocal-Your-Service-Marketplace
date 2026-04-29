import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false - don't block initial render
  const [initialized, setInitialized] = useState(false);
  const userRef = useRef(null);

  const extractAuthPayload = (payload = {}) => {
    const container = payload.data ?? payload;
    return {
      token: container.token,
      user: container.user,
    };
  };

  const persistUser = (nextUser) => {
    userRef.current = nextUser || null;
    setUser(nextUser || null);
  };

  const refreshProfile = async ({ silent = false } = {}) => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      persistUser(null);
      setInitialized(true);
      return null;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await api.get("/auth/profile");
      const userFromResponse = response.data?.data?.user ?? response.data?.user;
      persistUser(userFromResponse || null);
      return userFromResponse || null;
    } catch (error) {
      sessionStorage.removeItem("token");
      persistUser(null);
      return null;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Use startTransition to prevent blocking UI
  useEffect(() => {
    // Don't block - load profile in background
    refreshProfile();

    const intervalId = window.setInterval(() => {
      if (sessionStorage.getItem("token")) {
        refreshProfile({ silent: true });
      }
    }, 60000); // Increased to 60s

    const handleFocus = () => {
      if (sessionStorage.getItem("token")) {
        refreshProfile({ silent: true });
      }
    };

    const handleAccessUpdate = () => {
      if (sessionStorage.getItem("token")) {
        refreshProfile({ silent: true });
      }
    };

    const handleAccountBroadcast = (event) => {
      if (event.key !== "account-access-updated" || !event.newValue) {
        return;
      }

      const token = sessionStorage.getItem("token");
      if (!token) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue);
        const currentUserId = String(userRef.current?.id || userRef.current?._id || "");
        const updatedUserId = String(payload?.userId || "");

        if (!updatedUserId || updatedUserId === currentUserId) {
          refreshProfile({ silent: true });
        }
      } catch {
        refreshProfile({ silent: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("account-access-updated", handleAccessUpdate);
    window.addEventListener("storage", handleAccountBroadcast);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("account-access-updated", handleAccessUpdate);
      window.removeEventListener("storage", handleAccountBroadcast);
    };
  }, []);

  const login = async (email, password, role) => {
    try {
      const response = await api.post("/auth/signIn", {
        email,
        password,
        role,
      });
      const { token, user } = extractAuthPayload(response.data);
      if (!token || !user) {
        throw new Error("Invalid login response from server");
      }
      sessionStorage.setItem("token", token);
      persistUser(user);
      return { success: true, user };
    } catch (error) {
      let errorMessage = error.response?.data?.message || "Login failed";

      // Check if there are validation errors from express-validator
      if (
        error.response?.data?.errors &&
        error.response.data.errors.length > 0
      ) {
        errorMessage = error.response.data.errors[0].msg;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const register = async (
    name,
    email,
    phone,
    password,
    role,
    profilePhoto = "",
    serviceType = "",
    workCategories = [],
  ) => {
    try {
      const [firstName, ...rest] = String(name || "")
        .trim()
        .split(" ");
      const lastName = rest.join(" ") || "User";

      const response = await api.post("/auth/register", {
        firstName: firstName || "User",
        lastName,
        email,
        phone,
        password,
        role,
        profilePhoto,
        serviceType,
        workCategories,
        agreeToTerms: true,
      });
      const { token, user } = extractAuthPayload(response.data);
      if (!token || !user) {
        throw new Error("Invalid registration response from server");
      }
      sessionStorage.setItem("token", token);
      persistUser(user);
      return { success: true, user };
    } catch (error) {
      let errorMessage = error.response?.data?.message || "Registration failed";

      // Check if there are validation errors from express-validator
      if (
        error.response?.data?.errors &&
        error.response.data.errors.length > 0
      ) {
        errorMessage = error.response.data.errors[0].msg;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const updateProfile = async (payload) => {
    try {
      const response = await api.put("/auth/profile", payload);
      const updated = response.data?.data?.user ?? response.data?.user;
      if (updated) {
        persistUser(updated);
      }
      return { success: true, user: updated };
    } catch (error) {
      let errorMessage =
        error.response?.data?.message || "Profile update failed";

      // Check if there are validation errors from express-validator
      if (
        error.response?.data?.errors &&
        error.response.data.errors.length > 0
      ) {
        errorMessage = error.response.data.errors[0].msg;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const logout = (options = {}) => {
    const { redirectTo = "/" } = options;

    sessionStorage.removeItem("token");
    disconnectSocket();
    persistUser(null);

    if (typeof window !== "undefined" && redirectTo) {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (currentPath !== redirectTo) {
        window.location.replace(redirectTo);
      }
    }
  };

  const setUserData = (nextUser) => {
    persistUser(nextUser || null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    updateProfile,
    setUserData,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
