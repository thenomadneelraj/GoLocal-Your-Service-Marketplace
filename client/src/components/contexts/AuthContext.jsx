import { createContext, useContext, useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);

  const extractAuthPayload = (payload = {}) => {
    const container = payload.data ?? payload;
    return {
      token: container.token,
      user: container.user,
    };
  };

  const persistUser = (nextUser) => {
    setUser(nextUser || null);
  };

  const refreshProfile = async ({ silent = false } = {}) => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      persistUser(null);
      setLoading(false);
      return null;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await api.get("/api/auth/profile");
      const userFromResponse =
        response.data?.data?.user ?? response.data?.user;
      persistUser(userFromResponse || null);
      return userFromResponse || null;
    } catch (error) {
      sessionStorage.removeItem("token");
      persistUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const intervalId = window.setInterval(() => {
      if (sessionStorage.getItem("token")) {
        refreshProfile({ silent: true });
      }
    }, 30000);

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

    window.addEventListener("focus", handleFocus);
    window.addEventListener("account-access-updated", handleAccessUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("account-access-updated", handleAccessUpdate);
    };
  }, []);

  const login = async (email, password, role) => {
    try {
      const response = await api.post("/api/auth/signIn", {
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
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors[0].msg;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const register = async (name, email, phone, password, role, profilePhoto = "", serviceType = "") => {
    try {
      const [firstName, ...rest] = String(name || "").trim().split(" ");
      const lastName = rest.join(" ") || "User";

      const response = await api.post("/api/auth/register", {
        firstName: firstName || "User",
        lastName,
        email,
        phone,
        password,
        role,
        profilePhoto,
        serviceType,
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
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
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
      const response = await api.put("/api/auth/profile", payload);
      const updated = response.data?.data?.user ?? response.data?.user;
      if (updated) {
        persistUser(updated);
      }
      return { success: true, user: updated };
    } catch (error) {
      let errorMessage = error.response?.data?.message || "Profile update failed";
      
      // Check if there are validation errors from express-validator
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
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
      const currentPath =
        `${window.location.pathname}${window.location.search}${window.location.hash}`;

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
