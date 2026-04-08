import React from "react";
import { useLocation } from "react-router-dom";
import ClientSidebar from "./ClientSidebar";
import ProviderSidebar from "./ProviderSidebar";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/components/contexts/AuthContext";

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return null; // Don't render sidebar if not authenticated
  }

  const getSidebarComponent = () => {
    switch (user.role) {
      case "client":
        return <ClientSidebar />;
      case "provider":
        return <ProviderSidebar />;
      case "admin":
        return <AdminSidebar />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 z-40 transform transition-transform duration-300 ease-in-out">
      <div className="h-full w-full">
        {getSidebarComponent()}
      </div>
    </div>
  );
};

export default Sidebar;
