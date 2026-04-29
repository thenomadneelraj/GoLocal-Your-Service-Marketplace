import React from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import api from "@/lib/api";

const useSidebarData = () => {
  const { user } = useAuth();

  const fetchSidebarData = async () => {
    if (!user) return;

    try {
      const response = await api.get("/user/sidebar-data");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch sidebar data:", error);
      return {};
    }
  };

  return { user, fetchSidebarData };
};

export default useSidebarData;
