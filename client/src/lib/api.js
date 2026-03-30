import axios from "axios";

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
    if (error?.response?.status === 403 && error?.response?.data?.code === "ACCOUNT_RESTRICTED") {
      window.dispatchEvent(new Event("account-access-updated"));
    }
    if (error?.response?.status === 401) {
      sessionStorage.removeItem("token");
      if (!window.location.pathname.startsWith("/signin")) {
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
