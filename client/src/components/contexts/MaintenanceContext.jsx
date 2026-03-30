import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const MaintenanceContext = createContext(null);

const DEFAULT_STATUS = {
  maintenanceMode: false,
  platformName: "GoLocal",
  supportEmail: "support@golocal.com",
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenance must be used within a MaintenanceProvider");
  }
  return context;
};

export const MaintenanceProvider = ({ children }) => {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  const refreshStatus = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await api.get("/api/auth/platform-status");
      const nextStatus = response.data?.data || {};

      setStatus({
        maintenanceMode: Boolean(nextStatus.maintenanceMode),
        platformName: nextStatus.platformName || DEFAULT_STATUS.platformName,
        supportEmail: nextStatus.supportEmail || DEFAULT_STATUS.supportEmail,
      });
    } catch (error) {
      console.error("Failed to load platform status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();

    const intervalId = window.setInterval(() => {
      refreshStatus({ silent: true });
    }, 30000);

    const handleFocus = () => {
      refreshStatus({ silent: true });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <MaintenanceContext.Provider
      value={{
        ...status,
        loading,
        refreshStatus,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export default MaintenanceContext;
