import React from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import { useAuth } from "@/components/contexts/AuthContext";

const DashboardLayout = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
            <p className="text-muted-foreground">Access your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
